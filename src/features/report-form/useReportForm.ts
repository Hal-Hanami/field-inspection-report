import { useState } from 'react';
import { useForm, type FieldPath, type Resolver, type UseFormReturn } from 'react-hook-form';
import { DraftRejectedError } from '../../data/InspectionRepository';
import { useRepository } from '../../data/repositoryContext';
import {
  CHECK_ITEMS,
  validateDraft,
  type CheckItem,
  type CheckResult,
  type EquipmentType,
  type InspectionReport,
  type ReportDraft,
} from '../../domain';

/**
 * The form's view model (DESIGN §3.5). Empty strings stand for "not answered yet":
 * the domain rejects them (DESIGN §2.1), so an unanswered item cannot pass as `ok`.
 */
export type ReportFormValues = {
  equipmentId: string;
  equipmentType: EquipmentType | '';
  inspectedAt: string;
  inspectorName: string;
  checks: Record<CheckItem, CheckResult | ''>;
  remarks: string;
};

export const emptyFormValues: ReportFormValues = {
  equipmentId: '',
  equipmentType: '',
  inspectedAt: '',
  inspectorName: '',
  checks: Object.fromEntries(CHECK_ITEMS.map((item) => [item, ''])) as Record<
    CheckItem,
    CheckResult | ''
  >,
  remarks: '',
};

function assignError(target: Record<string, unknown>, path: string, message: string): void {
  const segments = path.split('.');
  let cursor = target;
  for (const segment of segments.slice(0, -1)) {
    cursor[segment] ??= {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const leaf = segments[segments.length - 1];
  // A field can break more than one rule at once ("missing" and "wrong shape"). The
  // first is the one to act on; the rest are consequences of it.
  cursor[leaf] ??= { type: 'domain', message };
}

/**
 * The form is validated by the domain rules themselves (DESIGN §2), not by a copy of
 * them written for the UI — a copy is a second rule set that drifts.
 *
 * @param now injected so a test can state the clock (DESIGN §2.4).
 */
export function createDraftResolver(now: () => Date): Resolver<ReportFormValues, unknown, ReportDraft> {
  return (values) => {
    const result = validateDraft(values, now());
    if (result.valid) return { values: result.draft, errors: {} };

    const errors: Record<string, unknown> = {};
    // §2.7 — every failing field at once, so one submit reveals every mistake.
    for (const error of result.errors) assignError(errors, error.path, error.message);
    return { values: {}, errors: errors as never };
  };
}

export type UseReportFormResult = {
  form: UseFormReturn<ReportFormValues, unknown, ReportDraft>;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  saveError: string | null;
};

export function useReportForm(options: {
  onSaved: (report: InspectionReport) => void;
  now?: () => Date;
}): UseReportFormResult {
  const repository = useRepository();
  const [saveError, setSaveError] = useState<string | null>(null);
  const now = options.now ?? (() => new Date());

  const form = useForm<ReportFormValues, unknown, ReportDraft>({
    defaultValues: emptyFormValues,
    resolver: createDraftResolver(now),
    // Errors appear on submit, then track each edit: nothing turns red before the
    // first attempt, and a corrected field stops being red as soon as it is correct.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // §5.3 — focus moves to the first invalid control.
    shouldFocusError: true,
  });

  // One key per draft (DESIGN §7.6): pressing the button again after a lost response is
  // a retry of the same filing, not a second report.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const submit = form.handleSubmit(async (draft) => {
    setSaveError(null);
    try {
      options.onSaved(await repository.save(draft, { idempotencyKey }));
    } catch (error) {
      if (error instanceof DraftRejectedError) {
        // The server is the authority (DESIGN §7.2): a rule the web's copy did not catch,
        // or a clock that disagrees, is shown on the field it concerns (DESIGN §5.2).
        for (const { path, message } of error.errors) {
          form.setError(path as FieldPath<ReportFormValues>, { type: 'server', message });
        }
        const first = error.errors[0];
        if (first) form.setFocus(first.path as FieldPath<ReportFormValues>);
        return;
      }
      // An outage or a defect; either way the person is told rather than left waiting.
      setSaveError('errors.save.failed');
    }
  });

  return { form, submit, saveError };
}
