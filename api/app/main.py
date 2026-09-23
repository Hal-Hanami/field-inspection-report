"""The composition root: the one place that picks the adapter and the clock."""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from sqlalchemy import create_engine

from app.http import problems
from app.http.routes import router
from app.repository.port import ReportRepository
from app.repository.postgres import PostgresReportRepository
from app.settings import Settings, get_settings


def create_app(
    repository: ReportRepository | None = None,
    clock: Callable[[], datetime] | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Field inspection reports",
        version="0.1.0",
        description="Files inspection reports and lists them. See docs/DESIGN.md, section 7.",
    )
    app.state.repository = repository or PostgresReportRepository(
        create_engine(settings.database_url, pool_pre_ping=True)
    )
    app.state.clock = clock or (lambda: datetime.now(UTC))
    app.state.zone = settings.zone
    problems.install(app)
    app.include_router(router)

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            app.openapi_schema = problems.drop_plain_json_for_problems(
                get_openapi(
                    title=app.title,
                    version=app.version,
                    description=app.description,
                    routes=app.routes,
                )
            )
        return app.openapi_schema

    app.openapi = openapi
    return app
