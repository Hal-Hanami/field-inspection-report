"""Conversions between the domain and the wire format."""

import base64
import binascii
import json
from datetime import UTC, datetime

from app.domain import Report, severity_of
from app.http.schemas import ChecksOut, ReportOut
from app.repository.port import Cursor


def report_out(report: Report) -> ReportOut:
    draft = report.draft
    return ReportOut(
        id=report.id,
        equipmentId=draft.equipment_id,
        equipmentType=draft.equipment_type,
        inspectedAt=draft.inspected_at.strftime("%Y-%m-%dT%H:%M"),
        inspectorName=draft.inspector_name,
        checks=ChecksOut.model_validate(draft.checks),
        remarks=draft.remarks,
        submittedAt=format_instant(report.submitted_at),
        severity=severity_of(draft.checks),
    )


def format_instant(moment: datetime) -> str:
    """UTC with millisecond precision and `Z`: the form `Date.prototype.toISOString` writes."""
    return moment.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def encode_cursor(cursor: Cursor) -> str:
    payload = json.dumps({"at": cursor.inspected_at.isoformat(), "seq": cursor.seq})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def decode_cursor(value: str) -> Cursor | None:
    """None for anything this server did not issue."""
    try:
        padded = value + "=" * (-len(value) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()))
        return Cursor(inspected_at=datetime.fromisoformat(payload["at"]), seq=int(payload["seq"]))
    except (ValueError, KeyError, TypeError, binascii.Error):
        return None
