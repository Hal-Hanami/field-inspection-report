import type { DraftValidationError, InspectionReport, ReportDraft } from '../domain';
import type { Problem, ReportOut, ReportPage } from './api/schema';
import {
  DraftRejectedError,
  type InspectionRepository,
  type SaveOptions,
} from './InspectionRepository';

/**
 * The adapter for the server of DESIGN §7. It speaks the wire types generated from the
 * server's OpenAPI document (§7.4), so a field the server renames fails to compile here.
 */

/** A response the adapter cannot turn into an answer: an outage, or a defect. */
export class RepositoryUnavailableError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RepositoryUnavailableError';
    this.status = status;
  }
}

function toReport(wire: ReportOut): InspectionReport {
  // `severity` is left behind: the web derives its own (DESIGN §1.3), and §7.3 holds the
  // two derivations to the same answers.
  return {
    id: wire.id,
    equipmentId: wire.equipmentId,
    equipmentType: wire.equipmentType,
    inspectedAt: wire.inspectedAt,
    inspectorName: wire.inspectorName,
    checks: wire.checks,
    remarks: wire.remarks,
    submittedAt: wire.submittedAt,
  };
}

async function failure(response: Response): Promise<RepositoryUnavailableError> {
  const problem = (await response.json().catch(() => null)) as Problem | null;
  return new RepositoryUnavailableError(response.status, problem?.title ?? response.statusText);
}

export function createHttpRepository(
  baseUrl: string,
  request: typeof fetch = (input, init) => fetch(input, init),
): InspectionRepository {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`;

  return {
    async list() {
      // The screen shows every report, so the adapter follows the cursor to the end
      // (DESIGN §7.9); paging in the UI is outside this application's scope.
      const reports: InspectionReport[] = [];
      let cursor: string | null = null;
      do {
        const query = new URLSearchParams({ limit: '200' });
        if (cursor) query.set('cursor', cursor);
        const response = await request(url(`/reports?${query.toString()}`));
        if (!response.ok) throw await failure(response);
        const page = (await response.json()) as ReportPage;
        reports.push(...page.items.map(toReport));
        cursor = page.nextCursor;
      } while (cursor);
      return reports;
    },

    async get(id: string) {
      const response = await request(url(`/reports/${encodeURIComponent(id)}`));
      if (response.status === 404) return null;
      if (!response.ok) throw await failure(response);
      return toReport((await response.json()) as ReportOut);
    },

    async save(draft: ReportDraft, { idempotencyKey }: SaveOptions) {
      const response = await request(url('/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(draft),
      });
      if (response.status === 422) {
        // The server is the authority (DESIGN §7.2). A rule the web's copy missed still
        // reaches the field it concerns, with the same keys the form already shows.
        const problem = (await response.json()) as Problem;
        const errors: DraftValidationError[] = (problem.errors ?? []).map((error) => ({
          path: error.field,
          message: error.key,
        }));
        throw new DraftRejectedError(errors);
      }
      if (!response.ok) throw await failure(response);
      return toReport((await response.json()) as ReportOut);
    },
  };
}
