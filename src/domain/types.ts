/**
 * The vocabulary of the domain: what a report is made of (DESIGN §1.1) and which
 * values each part may take. Nothing here imports a framework (DESIGN §3.1).
 */

export const EQUIPMENT_TYPES = [
  'transformer',
  'pole',
  'switchgear',
  'insulator',
  'meter',
] as const;

export const CHECK_ITEMS = [
  'appearance',
  'abnormalSound',
  'temperature',
  'corrosion',
  'surroundings',
] as const;

/** Ordered from least to most serious; the order carries meaning (DESIGN §1.3). */
export const CHECK_RESULTS = ['ok', 'caution', 'abnormal'] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export type CheckItem = (typeof CHECK_ITEMS)[number];
export type CheckResult = (typeof CHECK_RESULTS)[number];

/** Every item carries a result, so "unanswered" cannot be expressed here (DESIGN §1.1). */
export type Checks = Record<CheckItem, CheckResult>;

/** What the form produces: a report without the fields the repository assigns (DESIGN §1.2). */
export type ReportDraft = {
  equipmentId: string;
  equipmentType: EquipmentType;
  inspectedAt: string;
  inspectorName: string;
  checks: Checks;
  remarks: string;
};

export type InspectionReport = ReportDraft & {
  id: string;
  submittedAt: string;
};

// ASCII digits spelled out: `\d` is ASCII-only here and Unicode-wide in Python, and the
// server must agree with this pattern (DESIGN §1.2, §7.3).
export const EQUIPMENT_ID_PATTERN = /^[A-Z]{2}-[0-9]{4}$/;
// At least four digits, not exactly four: report 10000 is still a report (DESIGN §1.2).
export const REPORT_ID_PATTERN = /^RPT-[0-9]{4,}$/;
/** The value a `datetime-local` control produces, and the only form accepted (DESIGN §2.4). */
export const INSPECTED_AT_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/;

export const REMARKS_MAX_LENGTH = 200;
export const REMARKS_MIN_LENGTH_WHEN_ABNORMAL = 5;
export const INSPECTOR_NAME_MAX_LENGTH = 32;
