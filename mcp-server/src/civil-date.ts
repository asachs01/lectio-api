/**
 * Civil-date helpers that never use local or UTC Date arithmetic on YYYY-MM-DD
 * strings. Lexicographic comparison is valid for zero-padded ISO dates.
 */

export const DEFAULT_TIMEZONE = process.env.LECTIO_TIMEZONE || 'America/New_York';

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCivilDate(value: string): boolean {
  const match = CIVIL_DATE.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function assertCivilDate(value: string, label = 'date'): string {
  if (!isCivilDate(value)) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format`);
  }
  return value;
}

/** Inclusive range check on YYYY-MM-DD strings. */
export function civilDateInInclusiveRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** Take a YYYY-MM-DD prefix from an ISO timestamp or pass a civil date through. */
export function toCivilDate(value: string): string {
  if (value.length >= 10 && isCivilDate(value.slice(0, 10))) {
    return value.slice(0, 10);
  }
  return value;
}

export function resolveTimeZone(tz?: string): string {
  const zone = tz && tz.trim().length > 0 ? tz.trim() : DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date());
    return zone;
  } catch {
    throw new Error(`Invalid IANA timezone: ${zone}`);
  }
}

export function civilYearInTimeZone(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  if (!year) {
    throw new Error(`Could not determine the civil year in timezone ${timeZone}`);
  }
  return Number(year);
}

export const TRADITIONS = ['rcl', 'catholic', 'episcopal', 'bcp'] as const;
export type Tradition = (typeof TRADITIONS)[number];

export function resolveTradition(tradition?: string): Tradition {
  const value = (tradition || 'rcl').toLowerCase();
  if ((TRADITIONS as readonly string[]).includes(value)) {
    return value as Tradition;
  }
  throw new Error(`Unknown tradition "${tradition}". Use one of: ${TRADITIONS.join(', ')}`);
}
