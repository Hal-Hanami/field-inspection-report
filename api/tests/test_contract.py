"""DESIGN §7.3: the server runs the cases the web runs (src/domain/__tests__/contract.test.ts)."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

from app.domain import Draft, severity_of, validate_draft

CONTRACT = json.loads(
    (Path(__file__).resolve().parents[2] / "contracts" / "validation-cases.json").read_text()
)


def _apply(draft: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    return {**draft, **patch, "checks": {**draft["checks"], **patch.get("checks", {})}}


def _as_wire(draft: Draft) -> dict[str, Any]:
    return {
        "equipmentId": draft.equipment_id,
        "equipmentType": draft.equipment_type,
        "inspectedAt": draft.inspected_at.strftime("%Y-%m-%dT%H:%M"),
        "inspectorName": draft.inspector_name,
        "checks": dict(draft.checks),
        "remarks": draft.remarks,
    }


def _cases(valid: bool) -> list[Any]:
    return [
        pytest.param(case, id=case["name"])
        for case in CONTRACT["draftCases"]
        if case["expect"]["valid"] is valid
    ]


@pytest.mark.parametrize("case", _cases(valid=True))
def test_section_7_3_valid_draft_normalizes_as_the_web_does(case: dict[str, Any]) -> None:
    raw = _apply(CONTRACT["baseDraft"], case["patch"])
    result = validate_draft(raw, datetime.fromisoformat(case["now"]))
    assert isinstance(result, Draft), result
    assert _as_wire(result) == _apply(raw, case["expect"]["normalizedPatch"])


@pytest.mark.parametrize("case", _cases(valid=False))
def test_section_7_3_invalid_draft_fails_as_the_web_does(case: dict[str, Any]) -> None:
    raw = _apply(CONTRACT["baseDraft"], case["patch"])
    result = validate_draft(raw, datetime.fromisoformat(case["now"]))
    assert isinstance(result, list)
    paths = [error.path for error in result]
    assert len(paths) == len(set(paths)), "one message per field"
    assert {error.path: error.key for error in result} == case["expect"]["errors"]


@pytest.mark.parametrize(
    "case", [pytest.param(c, id=c["severity"]) for c in CONTRACT["severityCases"]]
)
def test_section_7_3_severity_matches_the_web(case: dict[str, Any]) -> None:
    assert severity_of(case["checks"]) == case["severity"]
