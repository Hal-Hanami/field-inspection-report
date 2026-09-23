"""What a report is made of (DESIGN §1.1). Values are the wire names the web uses."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, get_args

EquipmentType = Literal["transformer", "pole", "switchgear", "insulator", "meter"]
CheckItem = Literal["appearance", "abnormalSound", "temperature", "corrosion", "surroundings"]
# Ordered from least to most serious; the order carries meaning (DESIGN §1.3).
CheckResult = Literal["ok", "caution", "abnormal"]

EQUIPMENT_TYPES: tuple[EquipmentType, ...] = get_args(EquipmentType)
CHECK_ITEMS: tuple[CheckItem, ...] = get_args(CheckItem)
CHECK_RESULTS: tuple[CheckResult, ...] = get_args(CheckResult)

REMARKS_MAX_LENGTH = 200
REMARKS_MIN_LENGTH_WHEN_ABNORMAL = 5
INSPECTOR_NAME_MAX_LENGTH = 32


@dataclass(frozen=True, slots=True)
class Draft:
    """A report before the repository assigns its id and submission time (DESIGN §1.2)."""

    equipment_id: str
    equipment_type: EquipmentType
    # Wall-clock time without a zone (DESIGN §1.1), so a naive datetime on purpose.
    inspected_at: datetime
    inspector_name: str
    checks: dict[CheckItem, CheckResult]
    remarks: str


@dataclass(frozen=True, slots=True)
class Report:
    id: str
    draft: Draft
    # An instant, with zone (DESIGN §7.8).
    submitted_at: datetime
