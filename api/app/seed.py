"""Load the demo reports into an empty database, for local development.

    uv run python -m app.seed ../src/locales/seed.ja.json

The web's static demo reads the same file (DESIGN §6.3), so both start from one data set.
Each report goes through the domain rules; a seed the form would reject is refused here too.
"""

import json
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, func, insert, select, text

from app.domain import CHECK_ITEMS, Draft, validate_draft
from app.repository.postgres import draft_digest
from app.repository.tables import report_checks, reports
from app.settings import get_settings


def seed(engine: Engine, entries: list[dict[str, Any]]) -> int:
    with engine.begin() as connection:
        if connection.execute(select(func.count()).select_from(reports)).scalar_one():
            return 0
        now = datetime.now(UTC).replace(tzinfo=None)
        for entry in entries:
            draft = validate_draft(entry, now)
            if not isinstance(draft, Draft):
                raise ValueError(f"{entry['id']}: {draft}")
            seq = int(entry["id"].removeprefix("RPT-"))
            connection.execute(
                insert(reports).values(
                    id=entry["id"],
                    seq=seq,
                    equipment_id=draft.equipment_id,
                    equipment_type=draft.equipment_type,
                    inspected_at=draft.inspected_at,
                    inspector_name=draft.inspector_name,
                    remarks=draft.remarks,
                    submitted_at=datetime.fromisoformat(entry["submittedAt"]),
                    # Derived from the id, so re-running a seed can never collide with a
                    # key a real client generated.
                    idempotency_key=uuid.uuid5(uuid.NAMESPACE_URL, f"seed:{entry['id']}"),
                    draft_digest=draft_digest(draft),
                )
            )
            connection.execute(
                insert(report_checks),
                [
                    {"report_id": entry["id"], "item": item, "result": draft.checks[item]}
                    for item in CHECK_ITEMS
                ],
            )
        # New reports continue after the seeded ids (DESIGN §7.5).
        connection.execute(text("SELECT setval('report_seq', (SELECT max(seq) FROM reports))"))
    return len(entries)


if __name__ == "__main__":
    count = seed(
        create_engine(get_settings().database_url),
        json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")),
    )
    sys.stdout.write(f"seeded {count} reports\n")
