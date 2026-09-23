/**
 * Display formatting for values the domain stores in machine form. Kept apart from the
 * domain: how a moment is written is a property of the screen, not of the report.
 */

/** `2026-09-22T09:20` becomes `2026-09-22 09:20` — sortable, unambiguous, no locale guess. */
export function formatDateTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

/** An instant (`2026-09-22T00:41:00.000Z`) as wall-clock time where the screen is read. */
export function formatInstant(value: string): string {
  const moment = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())} ${pad(
    moment.getHours(),
  )}:${pad(moment.getMinutes())}`;
}
