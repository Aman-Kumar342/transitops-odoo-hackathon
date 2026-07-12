/** Shared date helpers. Dates are compared against the server's UTC "today" (§18-M). */

/** UTC date at 00:00 for "today" - the boundary for expiry/future checks. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Parse a YYYY-MM-DD string to a Date at UTC midnight (matches @db.Date storage). */
export function parseIsoDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** True if the given YYYY-MM-DD date is strictly after today (a future date). */
export function isFutureDate(dateStr: string): boolean {
  return parseIsoDate(dateStr).getTime() > todayUtc().getTime();
}
