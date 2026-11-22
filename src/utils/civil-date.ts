/**
 * Timezone-safe civil date helpers.
 *
 * All arithmetic is done on calendar year-month-day values using a UTC
 * scratch Date, never local millisecond offsets. That keeps Lent, Advent,
 * and other computed dates stable under TZ=UTC and TZ=America/New_York.
 */

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function civilDate(year: number, month: number, day: number): CivilDate {
  return { year, month, day };
}

export function fromLocalDate(date: Date): CivilDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function toLocalDate(date: CivilDate): Date {
  return new Date(date.year, date.month - 1, date.day, 0, 0, 0, 0);
}

export function formatCivilDate(date: CivilDate): string {
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a civil date. Does not use Date parsing.
 */
export function parseCivilDate(value: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCivilDate(year, month, day)) {
    return null;
  }
  return { year, month, day };
}

export function isValidCivilDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const probe = addCivilDays({ year, month, day: 1 }, day - 1);
  return probe.year === year && probe.month === month && probe.day === day;
}

function toUtcScratch(date: CivilDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const scratch = toUtcScratch(date);
  scratch.setUTCDate(scratch.getUTCDate() + days);
  return {
    year: scratch.getUTCFullYear(),
    month: scratch.getUTCMonth() + 1,
    day: scratch.getUTCDate(),
  };
}

export function weekdayOf(date: CivilDate): number {
  return toUtcScratch(date).getUTCDay(); // 0 = Sunday
}

export function daysBetweenCivil(start: CivilDate, end: CivilDate): number {
  const startMs = toUtcScratch(start).getTime();
  const endMs = toUtcScratch(end).getTime();
  return Math.round((endMs - startMs) / 86400000);
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
}

export function isSameCivil(a: CivilDate, b: CivilDate): boolean {
  return compareCivil(a, b) === 0;
}

export function isCivilInRange(date: CivilDate, start: CivilDate, end: CivilDate): boolean {
  return compareCivil(date, start) >= 0 && compareCivil(date, end) <= 0;
}

/**
 * Sunday closest to a fixed civil date.
 * Sun–Wed round to the Sunday on or before the date;
 * Thu–Sat round to the following Sunday.
 */
export function sundayClosestTo(year: number, month: number, day: number): CivilDate {
  const date = civilDate(year, month, day);
  const weekday = weekdayOf(date);
  if (weekday <= 3) {
    return addCivilDays(date, -weekday);
  }
  return addCivilDays(date, 7 - weekday);
}

/**
 * Add a number of calendar days to a local Date, returning a new local
 * midnight Date. Prefer CivilDate arithmetic for new code.
 */
export function addDaysToLocalDate(date: Date, days: number): Date {
  return toLocalDate(addCivilDays(fromLocalDate(date), days));
}
