// Generated from api/openapi.json by `uv run python -m app.web_types` (DESIGN §7.4).
// Do not edit: change the server's schemas and regenerate; CI fails on a stale copy.

export type ChecksOut = {
  appearance: "ok" | "caution" | "abnormal";
  abnormalSound: "ok" | "caution" | "abnormal";
  temperature: "ok" | "caution" | "abnormal";
  corrosion: "ok" | "caution" | "abnormal";
  surroundings: "ok" | "caution" | "abnormal";
};

export type DraftIn = {
  equipmentId?: string;
  equipmentType?: string;
  inspectedAt?: string;
  inspectorName?: string;
  checks?: Record<string, string>;
  remarks?: string;
};

export type FieldErrorOut = {
  field: string;
  key: string;
};

export type Problem = {
  type?: string;
  title: string;
  status: number;
  detail?: string | null;
  errors?: FieldErrorOut[] | null;
};

export type ReportOut = {
  id: string;
  equipmentId: string;
  equipmentType: "transformer" | "pole" | "switchgear" | "insulator" | "meter";
  inspectedAt: string;
  inspectorName: string;
  checks: ChecksOut;
  remarks: string;
  submittedAt: string;
  severity: "ok" | "caution" | "abnormal";
};

export type ReportPage = {
  items: ReportOut[];
  nextCursor: string | null;
};
