import type { DraftValidationError, InspectionReport, ReportDraft } from '../domain';

/**
 * The only seam to the outside world (DESIGN §3.2). Both methods are asynchronous even
 * though today's adapter is local, so that putting a real server behind this interface
 * changes one file and no call site.
 */
export interface InspectionRepository {
  list(): Promise<InspectionReport[]>;
  save(draft: ReportDraft): Promise<InspectionReport>;
}

/** Thrown by `save` when a draft breaks DESIGN §2 — the rules hold behind the UI too. */
export class DraftRejectedError extends Error {
  readonly errors: DraftValidationError[];

  constructor(errors: DraftValidationError[]) {
    super('draft rejected');
    this.name = 'DraftRejectedError';
    this.errors = errors;
  }
}
