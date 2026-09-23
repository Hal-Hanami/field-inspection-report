"""Alembic entry point. The URL comes from the caller's config or from app.settings."""

from alembic import context
from sqlalchemy import create_engine

from app.repository.tables import metadata
from app.settings import get_settings

url = context.config.get_main_option("sqlalchemy.url") or get_settings().database_url

with create_engine(url).connect() as connection:
    context.configure(connection=connection, target_metadata=metadata)
    with context.begin_transaction():
        context.run_migrations()
