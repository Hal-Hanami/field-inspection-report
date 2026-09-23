"""The report domain: vocabulary, validity rules and severity (DESIGN §1, §2).

Nothing under this package imports FastAPI or SQLAlchemy (DESIGN §7.1).
"""

from app.domain.model import (
    CHECK_ITEMS,
    CHECK_RESULTS,
    EQUIPMENT_TYPES,
    CheckItem,
    CheckResult,
    Draft,
    EquipmentType,
    Report,
)
from app.domain.rules import FieldError, validate_draft
from app.domain.severity import severity_of

__all__ = [
    "CHECK_ITEMS",
    "CHECK_RESULTS",
    "EQUIPMENT_TYPES",
    "CheckItem",
    "CheckResult",
    "Draft",
    "EquipmentType",
    "FieldError",
    "Report",
    "severity_of",
    "validate_draft",
]
