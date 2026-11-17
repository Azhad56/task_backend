/**
 * Date-only policy: HTML date inputs and API date strings are calendar dates
 * (YYYY-MM-DD). They are stored as UTC midnight and read back from UTC date
 * parts so the calendar day does not shift with the server timezone.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function dateOnlyToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
