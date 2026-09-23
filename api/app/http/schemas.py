"""The wire format. `api/openapi.json` is generated from these, and the web's types from
that document (DESIGN §7.4), so a field renamed here fails the web's type check."""

from pydantic import BaseModel, ConfigDict

from app.domain import CheckResult, EquipmentType


class DraftIn(BaseModel):
    """Plain strings on purpose: an empty or unknown value is a domain error with a key the
    form can show (DESIGN §7.2), not a schema error the person cannot act on."""

    model_config = ConfigDict(extra="ignore")

    equipmentId: str = ""
    equipmentType: str = ""
    inspectedAt: str = ""
    inspectorName: str = ""
    checks: dict[str, str] = {}
    remarks: str = ""


class ChecksOut(BaseModel):
    appearance: CheckResult
    abnormalSound: CheckResult
    temperature: CheckResult
    corrosion: CheckResult
    surroundings: CheckResult


class ReportOut(BaseModel):
    id: str
    equipmentId: str
    equipmentType: EquipmentType
    inspectedAt: str
    inspectorName: str
    checks: ChecksOut
    remarks: str
    submittedAt: str
    # Derived on every read, never stored (DESIGN §1.3).
    severity: CheckResult


class ReportPage(BaseModel):
    items: list[ReportOut]
    nextCursor: str | None


class FieldErrorOut(BaseModel):
    field: str
    key: str


class Problem(BaseModel):
    """RFC 9457 problem details (DESIGN §7.10)."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    errors: list[FieldErrorOut] | None = None
