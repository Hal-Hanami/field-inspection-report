"""The validity rules of DESIGN §2, as the server enforces them (DESIGN §7.2).

The web holds a copy of these rules in `src/domain/schema.ts`. Wherever Python and
JavaScript differ by default — what `strip()` removes, what `len()` counts, what `\\d` and
`$` match — this module follows the JavaScript behaviour, and the shared cases of
DESIGN §7.3 check that the two copies agree.

Errors carry message keys from the web's locale file, never sentences (DESIGN §6.1).
"""

import re
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import cast

from app.domain.model import (
    CHECK_ITEMS,
    CHECK_RESULTS,
    EQUIPMENT_TYPES,
    INSPECTOR_NAME_MAX_LENGTH,
    REMARKS_MAX_LENGTH,
    REMARKS_MIN_LENGTH_WHEN_ABNORMAL,
    CheckItem,
    CheckResult,
    Draft,
    EquipmentType,
)

# `fullmatch` rather than `$`, which in Python also matches before a trailing newline.
EQUIPMENT_ID_PATTERN = re.compile(r"[A-Z]{2}-[0-9]{4}")
INSPECTED_AT_PATTERN = re.compile(r"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})")

# ECMAScript WhiteSpace and LineTerminator: what `String.prototype.trim` removes. Python's
# `str.strip()` also removes U+001C..U+001F and keeps U+FEFF, which the web does not.
_JS_WHITESPACE = "".join(
    chr(code_point)
    for code_point in (
        *range(0x0009, 0x000D + 1),  # tab, line feed, vertical tab, form feed, return
        0x0020,
        0x00A0,
        0x1680,
        *range(0x2000, 0x200A + 1),
        0x2028,
        0x2029,
        0x202F,
        0x205F,
        0x3000,
        0xFEFF,
    )
)


@dataclass(frozen=True, slots=True)
class FieldError:
    path: str
    key: str


def js_trim(value: str) -> str:
    return value.strip(_JS_WHITESPACE)


def utf16_length(value: str) -> int:
    """Length as a browser's `maxlength` counts it (DESIGN §2): an emoji is two."""
    return len(value.encode("utf-16-le")) // 2


def normalize_equipment_id(value: str) -> str:
    """A phone keyboard offers lower case first; that is not a wrong answer (DESIGN §1.2)."""
    return js_trim(value).upper()


def parse_inspected_at(value: str) -> datetime | None:
    """The device's `YYYY-MM-DDTHH:mm`, and a real moment (DESIGN §2.4), or None."""
    match = INSPECTED_AT_PATTERN.fullmatch(value)
    if match is None:
        return None
    year, month, day, hour, minute = (int(part) for part in match.groups())
    try:
        return datetime(year, month, day, hour, minute)
    except ValueError:
        return None


def validate_draft(raw: Mapping[str, object], now: datetime) -> Draft | list[FieldError]:
    """Every failing field at once, one key per field (DESIGN §2.7).

    `raw` is what a client sent, unchecked. `now` is the clock as wall-clock time in the
    users' zone, passed in so the rules never read it (DESIGN §2.4, §7.8).
    """
    equipment_id = _text(raw.get("equipmentId"))
    equipment_type = _equipment_type(raw.get("equipmentType"))
    inspected_at_text = _text(raw.get("inspectedAt"))
    inspected_at = parse_inspected_at(inspected_at_text)
    inspector_name = js_trim(_text(raw.get("inspectorName")))
    checks, check_errors = _checks(raw.get("checks"))
    remarks_text = _text(raw.get("remarks"))

    errors = [
        error
        for error in (
            _equipment_id_error(equipment_id),
            None
            if equipment_type
            else FieldError("equipmentType", "errors.equipmentType.required"),
            _inspected_at_error(inspected_at_text, inspected_at, now),
            _inspector_name_error(inspector_name),
            *check_errors,
            _remarks_error(remarks_text, checks),
        )
        if error is not None
    ]
    if errors or equipment_type is None or inspected_at is None:
        return errors
    return Draft(
        equipment_id=normalize_equipment_id(equipment_id),
        equipment_type=equipment_type,
        inspected_at=inspected_at,
        inspector_name=inspector_name,
        checks=checks,
        remarks=js_trim(remarks_text),
    )


def _equipment_id_error(value: str) -> FieldError | None:
    if not js_trim(value):
        return FieldError("equipmentId", "errors.equipmentId.required")
    if not EQUIPMENT_ID_PATTERN.fullmatch(normalize_equipment_id(value)):
        return FieldError("equipmentId", "errors.equipmentId.format")
    return None


def _inspected_at_error(text: str, parsed: datetime | None, now: datetime) -> FieldError | None:
    if not text:
        return FieldError("inspectedAt", "errors.inspectedAt.required")
    if parsed is None:
        return FieldError("inspectedAt", "errors.inspectedAt.invalid")
    if parsed > now:
        return FieldError("inspectedAt", "errors.inspectedAt.future")
    return None


def _inspector_name_error(trimmed: str) -> FieldError | None:
    if not trimmed:
        return FieldError("inspectorName", "errors.inspectorName.required")
    if utf16_length(trimmed) > INSPECTOR_NAME_MAX_LENGTH:
        return FieldError("inspectorName", "errors.inspectorName.tooLong")
    return None


def _checks(value: object) -> tuple[dict[CheckItem, CheckResult], list[FieldError]]:
    empty: Mapping[object, object] = {}
    answers = cast(Mapping[object, object], value) if isinstance(value, Mapping) else empty
    checks: dict[CheckItem, CheckResult] = {}
    errors: list[FieldError] = []
    for item in CHECK_ITEMS:
        result = _check_result(answers.get(item))
        # §2.1 — an unanswered item is an error, not an implied "ok".
        if result is None:
            errors.append(FieldError(f"checks.{item}", "errors.checks.required"))
        else:
            checks[item] = result
    return checks, errors


def _remarks_error(text: str, checks: Mapping[CheckItem, CheckResult]) -> FieldError | None:
    if utf16_length(text) > REMARKS_MAX_LENGTH:
        return FieldError("remarks", "errors.remarks.tooLong")
    # §2.2 — only answered items count; an unanswered one is its own error.
    if "abnormal" in checks.values() and (
        utf16_length(js_trim(text)) < REMARKS_MIN_LENGTH_WHEN_ABNORMAL
    ):
        return FieldError("remarks", "errors.remarks.requiredForAbnormal")
    return None


def _text(value: object) -> str:
    # A value of the wrong type is treated as missing: the key a person can act on is
    # "fill this in", and only a broken client sends anything else.
    return value if isinstance(value, str) else ""


def _check_result(value: object) -> CheckResult | None:
    return next((result for result in CHECK_RESULTS if result == value), None)


def _equipment_type(value: object) -> EquipmentType | None:
    return next((candidate for candidate in EQUIPMENT_TYPES if candidate == value), None)
