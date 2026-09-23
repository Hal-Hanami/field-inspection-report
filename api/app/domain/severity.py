"""Severity is derived from the checks on every read, never stored (DESIGN §1.3)."""

from collections.abc import Mapping

from app.domain.model import CHECK_ITEMS, CHECK_RESULTS, CheckItem, CheckResult


def severity_of(checks: Mapping[CheckItem, CheckResult]) -> CheckResult:
    worst: CheckResult = "ok"
    for item in CHECK_ITEMS:
        if CHECK_RESULTS.index(checks[item]) > CHECK_RESULTS.index(worst):
            worst = checks[item]
    return worst
