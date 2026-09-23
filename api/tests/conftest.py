"""Fixtures for tests that need PostgreSQL.

The database is built by running every migration from empty (DESIGN §7.11), never from
the table definitions, so a test cannot pass against a schema a deployment would not have.
Point `TEST_DATABASE_URL` at a database these tests may wipe; `compose.yaml` creates one.
"""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text

from app.main import create_app
from app.repository.postgres import PostgresReportRepository
from app.settings import Settings

API_ROOT = Path(__file__).resolve().parents[1]
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://inspection:inspection@localhost:55432/inspection_test",
)


def alembic_config(url: str) -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", url)
    return config


def reset_schema(engine: Engine) -> None:
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    engine = create_engine(TEST_DATABASE_URL)
    reset_schema(engine)
    command.upgrade(alembic_config(TEST_DATABASE_URL), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def repository(engine: Engine) -> PostgresReportRepository:
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE reports, report_checks"))
        connection.execute(text("ALTER SEQUENCE report_seq RESTART WITH 1"))
    return PostgresReportRepository(engine)


class Clock:
    """A clock a test sets, instead of one it mocks (DESIGN §2.4)."""

    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


@pytest.fixture
def clock() -> Clock:
    # 10:00 in Tokyo.
    return Clock(datetime(2026, 9, 23, 1, 0, tzinfo=UTC))


@pytest.fixture
def client(repository: PostgresReportRepository, clock: Clock) -> TestClient:
    settings = Settings(database_url=TEST_DATABASE_URL, app_time_zone="Asia/Tokyo")
    return TestClient(create_app(repository=repository, clock=clock, settings=settings))
