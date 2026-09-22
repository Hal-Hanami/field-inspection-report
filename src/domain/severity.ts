import { CHECK_ITEMS, type CheckResult, type Checks } from './types';

/**
 * Severity is derived from the checks on every read rather than stored, so a report
 * cannot disagree with itself (DESIGN §1.3).
 */

const RANK: Record<CheckResult, number> = { ok: 0, caution: 1, abnormal: 2 };

export function severityOf(checks: Checks): CheckResult {
  return CHECK_ITEMS.reduce<CheckResult>(
    (worst, item) => (RANK[checks[item]] > RANK[worst] ? checks[item] : worst),
    'ok',
  );
}

export function isAtLeast(result: CheckResult, threshold: CheckResult): boolean {
  return RANK[result] >= RANK[threshold];
}
