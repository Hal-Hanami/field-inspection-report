import type { InspectionReport } from './types';

/**
 * Newest inspection first (DESIGN §4.2): the office reads the list top-down, and the
 * report just filed has to be the one in view.
 */
export function sortByInspectedAtDesc(reports: InspectionReport[]): InspectionReport[] {
  return [...reports].sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt));
}
