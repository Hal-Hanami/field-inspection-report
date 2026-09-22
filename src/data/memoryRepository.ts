import seed from '../locales/seed.ja.json';
import {
  parseReports,
  validateDraft,
  type InspectionReport,
  type ReportDraft,
} from '../domain';
import { DraftRejectedError, type InspectionRepository } from './InspectionRepository';

/**
 * The shipped adapter (DESIGN §3.4): reports live in memory and are lost on reload.
 * It is not a cache and not a stand-in for persistence; the notice in the UI says so.
 */

export type MemoryRepositoryOptions = {
  reports?: InspectionReport[];
  /** Injected so that saving a report is reproducible in a test (DESIGN §2.4). */
  now?: () => Date;
};

function nextId(reports: InspectionReport[]): string {
  const highest = reports.reduce((max, report) => {
    const value = Number.parseInt(report.id.slice('RPT-'.length), 10);
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);
  return `RPT-${String(highest + 1).padStart(4, '0')}`;
}

export function loadSeedReports(): InspectionReport[] {
  // §6.3 — demo data is parsed with the rules the form enforces, so it cannot drift.
  return parseReports(seed);
}

export function createMemoryRepository(
  options: MemoryRepositoryOptions = {},
): InspectionRepository {
  const now = options.now ?? (() => new Date());
  let reports = options.reports ?? loadSeedReports();

  return {
    async list() {
      return [...reports];
    },

    async save(draft: ReportDraft) {
      const result = validateDraft(draft, now());
      if (!result.valid) throw new DraftRejectedError(result.errors);

      const report: InspectionReport = {
        ...result.draft,
        id: nextId(reports),
        submittedAt: now().toISOString(),
      };
      reports = [...reports, report];
      return report;
    },
  };
}
