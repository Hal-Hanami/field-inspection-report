"""DESIGN §7.11: migrations are the schema's only author."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import Engine, inspect

from app.repository.tables import metadata
from tests.conftest import TEST_DATABASE_URL, alembic_config, reset_schema


def test_section_7_11_the_migrated_schema_is_the_one_the_code_queries(engine: Engine) -> None:
    with engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), metadata)
    assert differences == []


def test_section_7_11_migrations_run_down_to_empty_and_back(engine: Engine) -> None:
    config = alembic_config(TEST_DATABASE_URL)
    command.downgrade(config, "base")
    assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    command.upgrade(config, "head")
    assert {"reports", "report_checks"} <= set(inspect(engine).get_table_names())


def test_section_7_11_the_test_database_is_built_from_empty(engine: Engine) -> None:
    # The session fixture drops the schema before migrating; this pins that it still does.
    reset_schema(engine)
    command.upgrade(alembic_config(TEST_DATABASE_URL), "head")
    assert {"reports", "report_checks"} <= set(inspect(engine).get_table_names())
