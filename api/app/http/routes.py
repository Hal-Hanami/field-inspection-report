"""HTTP to domain and back (DESIGN §7). No rule is decided here: validity is the domain's
(§7.2), storage the repository's."""

from collections.abc import Callable
from datetime import datetime
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, Query, Request, Response, status

from app.domain import Draft, validate_draft
from app.http import problems
from app.http.schemas import DraftIn, ReportOut, ReportPage
from app.http.wire import decode_cursor, encode_cursor, report_out
from app.repository.port import IdempotencyConflict, ReportRepository

router = APIRouter(prefix="/api")

Clock = Callable[[], datetime]


def repository(request: Request) -> ReportRepository:
    return request.app.state.repository


def clock(request: Request) -> Clock:
    return request.app.state.clock


def zone(request: Request) -> ZoneInfo:
    return request.app.state.zone


@router.get(
    "/reports",
    response_model=ReportPage,
    responses=problems.problem_responses(400),
    summary="List reports, newest inspection first",
)
def list_reports(
    reports: Annotated[ReportRepository, Depends(repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    cursor: Annotated[str | None, Query()] = None,
) -> ReportPage:
    after = None
    if cursor is not None:
        after = decode_cursor(cursor)
        if after is None:
            raise problems.bad_request("cursor: not issued by this server")
    page = reports.list(limit=limit, after=after)
    return ReportPage(
        items=[report_out(report) for report in page.reports],
        nextCursor=encode_cursor(page.next_cursor) if page.next_cursor else None,
    )


@router.get(
    "/reports/{report_id}",
    response_model=ReportOut,
    responses=problems.problem_responses(404),
    summary="One report with the result of every check item",
)
def get_report(
    report_id: str, reports: Annotated[ReportRepository, Depends(repository)]
) -> ReportOut:
    report = reports.get(report_id)
    if report is None:
        raise problems.not_found(report_id)
    return report_out(report)


@router.post(
    "/reports",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        200: {"model": ReportOut, "description": "Already created under this key"},
        **problems.problem_responses(400, 409, 422),
    },
    summary="File a report",
)
def create_report(
    body: DraftIn,
    response: Response,
    idempotency_key: Annotated[UUID, Header(alias="Idempotency-Key")],
    reports: Annotated[ReportRepository, Depends(repository)],
    read_clock: Annotated[Clock, Depends(clock)],
    users_zone: Annotated[ZoneInfo, Depends(zone)],
) -> ReportOut:
    instant = read_clock()
    # §7.8 — the clock as wall-clock time in the users' zone, the frame `inspectedAt` is in.
    wall_clock = instant.astimezone(users_zone).replace(tzinfo=None)
    result = validate_draft(body.model_dump(), wall_clock)
    if not isinstance(result, Draft):
        raise problems.invalid_draft(result)
    try:
        outcome = reports.create(result, idempotency_key=idempotency_key, submitted_at=instant)
    except IdempotencyConflict:
        raise problems.idempotency_conflict() from None
    if not outcome.created:
        response.status_code = status.HTTP_200_OK
    response.headers["Location"] = f"/api/reports/{outcome.report.id}"
    return report_out(outcome.report)
