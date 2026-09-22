import {
  CHECK_ITEMS,
  type Checks,
  type InspectionReport,
  type ReportDraft,
} from '../domain';

/** Builders, so a test states only the part it is about and the rest stays valid. */

export function makeChecks(overrides: Partial<Checks> = {}): Checks {
  const base = Object.fromEntries(CHECK_ITEMS.map((item) => [item, 'ok'])) as Checks;
  return { ...base, ...overrides };
}

export function makeDraft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    equipmentId: 'TR-0142',
    equipmentType: 'transformer',
    inspectedAt: '2026-09-22T09:20',
    inspectorName: 'Inspector',
    checks: makeChecks(),
    remarks: '',
    ...overrides,
  };
}

export function makeReport(overrides: Partial<InspectionReport> = {}): InspectionReport {
  return {
    ...makeDraft(),
    id: 'RPT-0001',
    submittedAt: '2026-09-22T00:41:00.000Z',
    ...overrides,
  };
}

/** A `datetime-local` value in the past, so a test does not expire with the calendar. */
export function pastDateTimeValue(minutesAgo = 60): string {
  const moment = new Date(Date.now() - minutesAgo * 60_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}T${pad(
    moment.getHours(),
  )}:${pad(moment.getMinutes())}`;
}
