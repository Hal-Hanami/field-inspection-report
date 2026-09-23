import type { DraftValidationError, InspectionReport, ReportDraft } from '../domain';

export type SaveOptions = {
  /**
   * Generated once per draft by the form. Sending the same draft again with the same key
   * files it once, which is what makes a retry after a lost response safe (DESIGN §7.6).
   */
  idempotencyKey: string;
};

/**
 * The only seam to the outside world (DESIGN §3.2). Every method is asynchronous, so the
 * screens are the same whether the data is in memory or behind a server (DESIGN §3.4).
 */
export interface InspectionRepository {
  /** Whether a saved report outlives a reload; the notice in the UI says which. */
  readonly persistent: boolean;
  list(): Promise<InspectionReport[]>;
  /** `null` for an unknown id: "no such report" is an answer, not a failure. */
  get(id: string): Promise<InspectionReport | null>;
  save(draft: ReportDraft, options: SaveOptions): Promise<InspectionReport>;
}

/**
 * Thrown by `save` when a draft breaks DESIGN §2 — the rules hold behind the UI too, and
 * the failing fields travel with the error so the form can mark each one.
 */
export class DraftRejectedError extends Error {
  readonly errors: DraftValidationError[];

  constructor(errors: DraftValidationError[]) {
    super('draft rejected');
    this.name = 'DraftRejectedError';
    this.errors = errors;
  }
}
