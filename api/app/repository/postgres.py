"""ReportRepository on PostgreSQL, through SQLAlchemy Core."""

import hashlib
import json
from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Connection, Engine, Row, insert, select, tuple_
from sqlalchemy.exc import IntegrityError

from app.domain import CHECK_ITEMS, CheckItem, CheckResult, Draft, Report
from app.repository.port import Created, Cursor, IdempotencyConflict, Page
from app.repository.tables import report_checks, report_seq, reports


def format_report_id(seq: int) -> str:
    # Python's format widens past four digits; SQL `lpad` would truncate 10000 to "1000".
    return f"RPT-{seq:04d}"


def draft_digest(draft: Draft) -> str:
    canonical = json.dumps(
        {
            "equipmentId": draft.equipment_id,
            "equipmentType": draft.equipment_type,
            "inspectedAt": draft.inspected_at.isoformat(),
            "inspectorName": draft.inspector_name,
            "checks": {item: draft.checks[item] for item in CHECK_ITEMS},
            "remarks": draft.remarks,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


class PostgresReportRepository:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def list(self, *, limit: int, after: Cursor | None) -> Page:
        query = select(reports).order_by(reports.c.inspected_at.desc(), reports.c.seq.desc())
        if after is not None:
            query = query.where(
                tuple_(reports.c.inspected_at, reports.c.seq) < (after.inspected_at, after.seq)
            )
        # One row more than asked for says whether another page exists without a count.
        with self._engine.connect() as connection:
            rows = connection.execute(query.limit(limit + 1)).all()
            page = rows[:limit]
            checks = self._checks_for(connection, [row.id for row in page])
        next_cursor = None
        if len(rows) > limit:
            last = page[-1]
            next_cursor = Cursor(inspected_at=last.inspected_at, seq=last.seq)
        return Page([_to_report(row, checks[row.id]) for row in page], next_cursor)

    def get(self, report_id: str) -> Report | None:
        with self._engine.connect() as connection:
            row = connection.execute(select(reports).where(reports.c.id == report_id)).first()
            if row is None:
                return None
            checks = self._checks_for(connection, [row.id])
        return _to_report(row, checks[row.id])

    def create(self, draft: Draft, *, idempotency_key: UUID, submitted_at: datetime) -> Created:
        digest = draft_digest(draft)
        existing = self._by_key(idempotency_key)
        if existing is not None:
            return self._replay(existing, digest)
        try:
            with self._engine.begin() as connection:
                seq = connection.execute(report_seq.next_value()).scalar_one()
                report_id = format_report_id(seq)
                connection.execute(
                    insert(reports).values(
                        id=report_id,
                        seq=seq,
                        equipment_id=draft.equipment_id,
                        equipment_type=draft.equipment_type,
                        inspected_at=draft.inspected_at,
                        inspector_name=draft.inspector_name,
                        remarks=draft.remarks,
                        submitted_at=submitted_at,
                        idempotency_key=idempotency_key,
                        draft_digest=digest,
                    )
                )
                connection.execute(
                    insert(report_checks),
                    [
                        {"report_id": report_id, "item": item, "result": draft.checks[item]}
                        for item in CHECK_ITEMS
                    ],
                )
        except IntegrityError:
            # Two requests with one key raced past the lookup above; the loser reads what
            # the winner stored instead of failing a retry that has in fact succeeded.
            existing = self._by_key(idempotency_key)
            if existing is None:
                raise
            return self._replay(existing, digest)
        return Created(Report(report_id, draft, submitted_at), created=True)

    def _by_key(self, idempotency_key: UUID) -> Row[Any] | None:
        with self._engine.connect() as connection:
            return connection.execute(
                select(reports.c.id, reports.c.draft_digest).where(
                    reports.c.idempotency_key == idempotency_key
                )
            ).first()

    def _replay(self, existing: Row[Any], digest: str) -> Created:
        if existing.draft_digest != digest:
            raise IdempotencyConflict
        report = self.get(existing.id)
        if report is None:  # pragma: no cover — reports are never deleted
            raise LookupError(existing.id)
        return Created(report, created=False)

    @staticmethod
    def _checks_for(
        connection: Connection, report_ids: Sequence[str]
    ) -> dict[str, dict[CheckItem, CheckResult]]:
        found: dict[str, dict[CheckItem, CheckResult]] = {report_id: {} for report_id in report_ids}
        if not report_ids:
            return found
        rows = connection.execute(
            select(report_checks).where(report_checks.c.report_id.in_(report_ids))
        ).all()
        for row in rows:
            found[row.report_id][row.item] = row.result
        return found


def _to_report(row: Row[Any], checks: dict[CheckItem, CheckResult]) -> Report:
    draft = Draft(
        equipment_id=row.equipment_id,
        equipment_type=row.equipment_type,
        inspected_at=row.inspected_at,
        inspector_name=row.inspector_name,
        checks=checks,
        remarks=row.remarks,
    )
    return Report(row.id, draft, row.submitted_at)
