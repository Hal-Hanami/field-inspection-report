"""The shared demo data loads through the domain rules (DESIGN §6.3, §7.5)."""

import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.repository.postgres import PostgresReportRepository
from app.seed import seed
from tests.api_helpers import post
from tests.drafts import draft

SEED = Path(__file__).resolve().parents[2] / "src" / "locales" / "seed.ja.json"


def test_section_6_3_the_web_demo_data_seeds_the_server(
    engine: Engine, repository: PostgresReportRepository, client: TestClient
) -> None:
    entries = json.loads(SEED.read_text(encoding="utf-8"))
    assert seed(engine, entries) == len(entries)
    assert seed(engine, entries) == 0, "seeding a database that has reports does nothing"
    listed = client.get("/api/reports").json()["items"]
    assert {item["id"] for item in listed} == {entry["id"] for entry in entries}


def test_section_7_5_new_reports_continue_after_the_seeded_ids(
    engine: Engine, repository: PostgresReportRepository, client: TestClient
) -> None:
    entries = json.loads(SEED.read_text(encoding="utf-8"))
    seed(engine, entries)
    highest = max(int(entry["id"].removeprefix("RPT-")) for entry in entries)
    assert post(client, draft()).json()["id"] == f"RPT-{highest + 1:04d}"
