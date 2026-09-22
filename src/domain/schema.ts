import { z } from 'zod';
import { severityOf } from './severity';
import {
  CHECK_RESULTS,
  EQUIPMENT_ID_PATTERN,
  EQUIPMENT_TYPES,
  INSPECTOR_NAME_MAX_LENGTH,
  REMARKS_MAX_LENGTH,
  REMARKS_MIN_LENGTH_WHEN_ABNORMAL,
  REPORT_ID_PATTERN,
  type Checks,
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
        .min(1, { error: 'errors.equipmentId.required' })
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
        .refine((value) => value.length === 0 || !Number.isNaN(new Date(value).getTime()), {
          error: 'errors.inspectedAt.invalid',
        })
        // A value that does not parse cannot be in the future; saying both at once sends
        // the reader after the wrong problem.
        .refine((value) => {
          const moment = new Date(value).getTime();
          return Number.isNaN(moment) || moment <= now.getTime();
        }, { error: 'errors.inspectedAt.future' }),
      inspectorName: z
        .string({ error: 'errors.inspectorName.required' })
        .refine((value) => value.trim().length > 0, { error: 'errors.inspectorName.required' })
        .refine((value) => value.trim().length <= INSPECTOR_NAME_MAX_LENGTH, {
          error: 'errors.inspectorName.tooLong',
        }),
      checks: checksSchema,
      remarks: z.string().max(REMARKS_MAX_LENGTH, { error: 'errors.remarks.tooLong' }),
    })
    .superRefine((draft, ctx) => {
      // §2.2 — an abnormal finding with no description cannot be acted on.
      if (severityOf(draft.checks as Checks) !== 'abnormal') return;
      if (draft.remarks.trim().length >= REMARKS_MIN_LENGTH_WHEN_ABNORMAL) return;
      ctx.addIssue({
        code: 'custom',
        path: ['remarks'],
        message: 'errors.remarks.requiredForAbnormal',
      });
    });
}

export type DraftValidationError = { path: string; message: string };

export type DraftValidationResult =
  | { valid: true; draft: ReportDraft }
  | { valid: false; errors: DraftValidationError[] };

/** §2.7 — every failing field is reported at once, not one per submit. */
export function validateDraft(input: unknown, now: Date): DraftValidationResult {
  const parsed = createDraftSchema(now).safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
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
