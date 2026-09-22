/**
 * Display formatting for values the domain stores in machine form. Kept apart from the
 * domain: how a moment is written is a property of the screen, not of the report.
 */

/** `2026-09-22T09:20` becomes `2026-09-22 09:20` — sortable, unambiguous, no locale guess. */
export function formatDateTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}
