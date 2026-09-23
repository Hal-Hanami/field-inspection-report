"""The server's one seam to storage (DESIGN §7). Routes depend on this, not on SQLAlchemy."""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain import Draft, Report


@dataclass(frozen=True, slots=True)
class Cursor:
    """Where the previous page ended, in listing order (DESIGN §7.9)."""

    inspected_at: datetime
    seq: int


@dataclass(frozen=True, slots=True)
class Page:
    reports: list[Report]
    next_cursor: Cursor | None


@dataclass(frozen=True, slots=True)
class Created:
    report: Report
    # False when the idempotency key had already created this report (DESIGN §7.6).
    created: bool


class IdempotencyConflict(Exception):
    """The key was used before, for a different draft (DESIGN §7.6)."""


class ReportRepository(Protocol):
    def list(self, *, limit: int, after: Cursor | None) -> Page: ...

    def get(self, report_id: str) -> Report | None: ...

    def create(self, draft: Draft, *, idempotency_key: UUID, submitted_at: datetime) -> Created:
        """Store a validated draft with all of its checks, in one transaction (§7.7)."""
        ...
