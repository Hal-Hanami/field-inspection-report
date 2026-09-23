import { z } from 'zod';
import {
  CHECK_ITEMS,
  CHECK_RESULTS,
  EQUIPMENT_ID_PATTERN,
  EQUIPMENT_TYPES,
  INSPECTED_AT_PATTERN,
  INSPECTOR_NAME_MAX_LENGTH,
  REMARKS_MAX_LENGTH,
  REMARKS_MIN_LENGTH_WHEN_ABNORMAL,
  REPORT_ID_PATTERN,
  type InspectionReport,
  type ReportDraft,
} from './types';

/**
 * The validity rules of DESIGN §2, written once. The form and the repository both run
 * them, so a second caller cannot skip what the UI enforces.
 *
 * Messages are translation keys, never sentences: this layer has no language
 * (DESIGN §6.1) and the UI resolves the key it is handed.
 */

// §2.1 — an unanswered item is an error, not an implied "ok".
const checkResultSchema = z.enum(CHECK_RESULTS, { error: 'errors.checks.required' });

/**
 * Spelled out rather than generated from CHECK_ITEMS, so the shape stays visible in the
 * type. A test holds the two in step (DESIGN §1.1).
 */
const checksSchema = z.object({
  appearance: checkResultSchema,
  abnormalSound: checkResultSchema,
  temperature: checkResultSchema,
  corrosion: checkResultSchema,
  surroundings: checkResultSchema,
});

/** §1.2 — a phone keyboard offers lower case first; that is not a wrong answer. */
export function normalizeEquipmentId(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Wall-clock time as a local `Date`, or `null` when the value is not a real moment in the
 * device format. `new Date(string)` is not used: it accepts `2026/09/22` and rolls 30
 * February over to March, and the server's parser does neither (DESIGN §2.4, §7.3).
 */
export function parseInspectedAt(value: string): Date | null {
  const match = INSPECTED_AT_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const moment = new Date(year, month - 1, day, hour, minute);
  const exact =
    moment.getFullYear() === year &&
    moment.getMonth() === month - 1 &&
    moment.getDate() === day &&
    moment.getHours() === hour &&
    moment.getMinutes() === minute;
  return exact ? moment : null;
}

export function normalizeDraft(draft: ReportDraft): ReportDraft {
  return {
    ...draft,
    equipmentId: normalizeEquipmentId(draft.equipmentId),
    inspectorName: draft.inspectorName.trim(),
    remarks: draft.remarks.trim(),
  };
}

/**
 * @param now the clock, passed in rather than read: the domain stays pure and a test
 *   states the time instead of mocking it (DESIGN §2.4).
 */
export function createDraftSchema(now: Date) {
  return z
    .object({
      equipmentId: z
        .string({ error: 'errors.equipmentId.required' })
        // Checked after trimming: `min(1)` alone lets spaces through, to be saved as "".
        .refine((value) => value.trim().length > 0, { error: 'errors.equipmentId.required' })
        // §1.2 — the pattern is checked against the normalized value. An empty field is
        // already reported as missing; telling someone their blank field is the wrong
        // shape sends them looking for a typo that is not there.
        .refine(
          (value) => value.trim().length === 0 || EQUIPMENT_ID_PATTERN.test(normalizeEquipmentId(value)),
          { error: 'errors.equipmentId.format' },
        ),
      equipmentType: z.enum(EQUIPMENT_TYPES, { error: 'errors.equipmentType.required' }),
      inspectedAt: z
        .string({ error: 'errors.inspectedAt.required' })
        .min(1, { error: 'errors.inspectedAt.required' })
        .refine((value) => value.length === 0 || parseInspectedAt(value) !== null, {
          error: 'errors.inspectedAt.invalid',
        })
        // A value that does not parse cannot be in the future; saying both at once sends
        // the reader after the wrong problem.
        .refine((value) => {
          const moment = parseInspectedAt(value);
          return moment === null || moment.getTime() <= now.getTime();
        }, { error: 'errors.inspectedAt.future' }),
      inspectorName: z
        .string({ error: 'errors.inspectorName.required' })
        .refine((value) => value.trim().length > 0, { error: 'errors.inspectorName.required' })
        .refine((value) => value.trim().length <= INSPECTOR_NAME_MAX_LENGTH, {
          error: 'errors.inspectorName.tooLong',
        }),
      checks: checksSchema,
      // `.length` counts UTF-16 code units, as the text box's maxlength does; Zod's
      // `.max()` counts code points and would allow what the box cannot hold (DESIGN §2).
      remarks: z
        .string()
        .refine((value) => value.length <= REMARKS_MAX_LENGTH, { error: 'errors.remarks.tooLong' }),
    });
}

/**
 * §2.2, checked apart from the schema: Zod skips object-level refinements while any field
 * fails, which would hold this error back until every other field was fixed — one more
 * round trip, against §2.7. Only answered items count; an unanswered one is its own error.
 */
function abnormalWithoutRemarks(input: unknown): DraftValidationError[] {
  if (typeof input !== 'object' || input === null) return [];
  const { checks, remarks } = input as { checks?: unknown; remarks?: unknown };
  if (typeof checks !== 'object' || checks === null) return [];
  const answers = checks as Record<string, unknown>;
  const anyAbnormal = CHECK_ITEMS.some((item) => answers[item] === 'abnormal');
  if (!anyAbnormal) return [];
  const text = typeof remarks === 'string' ? remarks.trim() : '';
  if (text.length >= REMARKS_MIN_LENGTH_WHEN_ABNORMAL) return [];
  return [{ path: 'remarks', message: 'errors.remarks.requiredForAbnormal' }];
}

export type DraftValidationError = { path: string; message: string };

export type DraftValidationResult =
  | { valid: true; draft: ReportDraft }
  | { valid: false; errors: DraftValidationError[] };

/** §2.7 — every failing field is reported at once, not one per submit. */
export function validateDraft(input: unknown, now: Date): DraftValidationResult {
  const parsed = createDraftSchema(now).safeParse(input);
  const fieldErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  // A remarks field that is also too long reports that first; one message per field.
  const crossField = abnormalWithoutRemarks(input).filter(
    (error) => !fieldErrors.some((existing) => existing.path === error.path),
  );
  const errors = [...fieldErrors, ...crossField];
  if (errors.length > 0 || !parsed.success) return { valid: false, errors };
  return { valid: true, draft: normalizeDraft(parsed.data as ReportDraft) };
}

const reportSchema = z.object({
  id: z.string().regex(REPORT_ID_PATTERN, { error: 'errors.id.format' }),
  equipmentId: z.string().regex(EQUIPMENT_ID_PATTERN, { error: 'errors.equipmentId.format' }),
  equipmentType: z.enum(EQUIPMENT_TYPES),
  inspectedAt: z.string().min(1),
  inspectorName: z.string().min(1).max(INSPECTOR_NAME_MAX_LENGTH),
  checks: checksSchema,
  remarks: z.string().max(REMARKS_MAX_LENGTH),
  submittedAt: z.string().min(1),
});

/**
 * §6.3 — seed data is parsed with the same rules the form enforces, so demo data
 * cannot drift into a state the application would reject.
 */
export function parseReports(input: unknown): InspectionReport[] {
  return z.array(reportSchema).parse(input) as InspectionReport[];
}
