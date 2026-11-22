import { CivilDate, formatCivilDate } from './civil-date';

export const DEFAULT_TIME_ZONE = 'America/New_York';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * True if `timeZone` is a valid IANA name (for example America/New_York or UTC).
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string' || timeZone.length > 64) {
    return false;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Default zone for "today". LECTIO_TIMEZONE if it is a valid IANA name,
 * otherwise America/New_York.
 */
export function getDefaultTimeZone(): string {
  const configured = process.env.LECTIO_TIMEZONE;
  if (configured && isValidTimeZone(configured)) {
    return configured;
  }
  return DEFAULT_TIME_ZONE;
}

/**
 * The civil date of `now` in an IANA time zone.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return { year, month, day };
}

export function formatTodayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return formatCivilDate(todayInTimeZone(timeZone, now));
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? '';
}
