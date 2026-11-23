/**
 * Unified, timezone-safe liturgical calendar.
 *
 * Date arithmetic uses civil year-month-day values (see civil-date.ts).
 * Public Date returns are local midnights so getFullYear/getMonth/getDate
 * and getDay stay correct in any timezone.
 */

import {
  CivilDate,
  addCivilDays,
  civilDate,
  compareCivil,
  daysBetweenCivil,
  formatCivilDate,
  fromLocalDate,
  isCivilInRange,
  isSameCivil,
  sundayClosestTo,
  toLocalDate,
  weekdayOf,
} from './civil-date';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface LiturgicalDate {
  date: Date;
  name: string;
  season: string;
  color: LiturgicalColor;
  rank: FeastRank;
  isMoveable: boolean;
}

export interface SeasonDates {
  name: string;
  startDate: Date;
  endDate: Date;
  color: LiturgicalColor;
  weekCount?: number;
}

export interface LiturgicalYear {
  year: number;
  cycle: 'A' | 'B' | 'C';
  advent1: Date;
  christmas: Date;
  epiphany: Date;
  ashWednesday: Date;
  palmSunday: Date;
  easter: Date;
  pentecost: Date;
  seasons: SeasonDates[];
}

export enum LiturgicalColor {
  WHITE = 'white',
  RED = 'red',
  GREEN = 'green',
  PURPLE = 'purple',
  VIOLET = 'violet',
  ROSE = 'rose',
  BLACK = 'black',
  GOLD = 'gold',
}

export enum FeastRank {
  PRINCIPAL_FEAST = 'principal_feast',
  FEAST = 'feast',
  LESSER_FEAST = 'lesser_feast',
  COMMEMORATION = 'commemoration',
  ORDINARY = 'ordinary',
}

export type CycleLetter = 'A' | 'B' | 'C';

export interface SundayObservance {
  date: Date;
  name: string;
  /** RCL Proper number (1–28), 29 for Christ the King, or null for other Sundays. */
  properNumber: number | null;
  /** When a Proper is omitted because a principal feast falls on the same Sunday. */
  omittedProperNumber: number | null;
  rank: FeastRank;
}

/**
 * RCL "Sunday closest to" anchors for Propers 1–28.
 * Month is 1-based.
 */
export const RCL_PROPER_ANCHORS: Readonly<Record<number, { month: number; day: number }>> = {
  1: { month: 5, day: 11 },
  2: { month: 5, day: 18 },
  3: { month: 5, day: 25 },
  4: { month: 6, day: 1 },
  5: { month: 6, day: 8 },
  6: { month: 6, day: 15 },
  7: { month: 6, day: 22 },
  8: { month: 6, day: 29 },
  9: { month: 7, day: 6 },
  10: { month: 7, day: 13 },
  11: { month: 7, day: 20 },
  12: { month: 7, day: 27 },
  13: { month: 8, day: 3 },
  14: { month: 8, day: 10 },
  15: { month: 8, day: 17 },
  16: { month: 8, day: 24 },
  17: { month: 8, day: 31 },
  18: { month: 9, day: 7 },
  19: { month: 9, day: 14 },
  20: { month: 9, day: 21 },
  21: { month: 9, day: 28 },
  22: { month: 10, day: 5 },
  23: { month: 10, day: 12 },
  24: { month: 10, day: 19 },
  25: { month: 10, day: 26 },
  26: { month: 11, day: 2 },
  27: { month: 11, day: 9 },
  28: { month: 11, day: 16 },
};

// =============================================================================
// CORE DATE CALCULATION
// =============================================================================

export function calculateEasterCivil(year: number): CivilDate {
  // Anonymous Gregorian algorithm (accurate for years 1583-4099)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return civilDate(year, month, day);
}

export function calculateEaster(year: number): Date {
  return toLocalDate(calculateEasterCivil(year));
}

/**
 * First Sunday of Advent is the Sunday falling on or between
 * November 27 and December 3. Equivalently: 28 days before Christmas
 * when Christmas is Sunday, otherwise 21 + weekday(Christmas) days before.
 */
export function calculateAdvent1Civil(year: number): CivilDate {
  const christmas = civilDate(year, 12, 25);
  const christmasWeekday = weekdayOf(christmas);
  const daysBack = christmasWeekday === 0 ? 28 : 21 + christmasWeekday;
  return addCivilDays(christmas, -daysBack);
}

export function calculateAdvent1(year: number): Date {
  return toLocalDate(calculateAdvent1Civil(year));
}

export function calculateAshWednesdayCivil(easter: CivilDate): CivilDate {
  return addCivilDays(easter, -46);
}

export function calculateAshWednesday(easter: Date): Date {
  return toLocalDate(calculateAshWednesdayCivil(fromLocalDate(easter)));
}

export function calculatePalmSundayCivil(easter: CivilDate): CivilDate {
  return addCivilDays(easter, -7);
}

export function calculatePalmSunday(easter: Date): Date {
  return toLocalDate(calculatePalmSundayCivil(fromLocalDate(easter)));
}

export function calculatePentecostCivil(easter: CivilDate): CivilDate {
  return addCivilDays(easter, 49);
}

export function calculatePentecost(easter: Date): Date {
  return toLocalDate(calculatePentecostCivil(fromLocalDate(easter)));
}

export function calculateTrinitySundayCivil(easter: CivilDate): CivilDate {
  return addCivilDays(easter, 56);
}

export function calculateChristTheKingCivil(adventYear: number): CivilDate {
  return addCivilDays(calculateAdvent1Civil(adventYear), -7);
}

/**
 * First Sunday after the Epiphany (January 6). If January 6 is already
 * Sunday, Baptism of the Lord is the following Sunday.
 */
export function calculateBaptismOfTheLordCivil(year: number): CivilDate {
  const epiphany = civilDate(year, 1, 6);
  const weekday = weekdayOf(epiphany);
  if (weekday === 0) {
    return addCivilDays(epiphany, 7);
  }
  return addCivilDays(epiphany, 7 - weekday);
}

/**
 * Holy Family: the Sunday after Christmas, or December 30 when
 * Christmas itself is Sunday.
 */
export function calculateHolyFamilyCivil(christmasYear: number): CivilDate {
  const christmas = civilDate(christmasYear, 12, 25);
  const weekday = weekdayOf(christmas);
  if (weekday === 0) {
    return civilDate(christmasYear, 12, 30);
  }
  return addCivilDays(christmas, 7 - weekday);
}

export function calculateSundayAfterPentecost(pentecost: Date, weekNumber: number): Date {
  return toLocalDate(addCivilDays(fromLocalDate(pentecost), weekNumber * 7));
}

/**
 * RCL Sunday cycle for the liturgical year that begins at Advent 1 of
 * the given civil year. Advent 2024 starts Year C, 2025 starts A, 2026 starts B.
 */
export function getLiturgicalCycle(adventYear: number): CycleLetter {
  // 2022, 2025, 2028 (% 3 === 0) start Year A;
  // 2023, 2026, 2029 (% 3 === 1) start Year B;
  // 2024, 2027, 2030 (% 3 === 2) start Year C.
  const remainder = ((adventYear % 3) + 3) % 3;
  return (['A', 'B', 'C'] as const)[remainder];
}

/**
 * Cycle letter in effect on a given civil date (most recent Advent 1).
 */
export function getLiturgicalCycleForDate(date: Date): CycleLetter {
  const civil = fromLocalDate(date);
  const adventThisYear = calculateAdvent1Civil(civil.year);
  const adventYear = compareCivil(civil, adventThisYear) >= 0 ? civil.year : civil.year - 1;
  return getLiturgicalCycle(adventYear);
}

/**
 * BCP Daily Office Year One begins at Advent 1 preceding odd-numbered
 * civil years (Advent 2024 → Year One). Year Two precedes even years.
 */
export function getDailyOfficeYear(adventYear: number): 1 | 2 {
  return adventYear % 2 === 0 ? 1 : 2;
}

export function getDailyOfficeYearForDate(date: Date): 1 | 2 {
  const civil = fromLocalDate(date);
  const adventThisYear = calculateAdvent1Civil(civil.year);
  const adventYear = compareCivil(civil, adventThisYear) >= 0 ? civil.year : civil.year - 1;
  return getDailyOfficeYear(adventYear);
}

export function getLiturgicalYearStartYear(date: Date): number {
  const civil = fromLocalDate(date);
  const adventThisYear = calculateAdvent1Civil(civil.year);
  return compareCivil(civil, adventThisYear) >= 0 ? civil.year : civil.year - 1;
}

// =============================================================================
// SEASONS
// =============================================================================

function seasonDatesFromCivil(
  name: string,
  start: CivilDate,
  end: CivilDate,
  color: LiturgicalColor,
  weekCount?: number,
): SeasonDates {
  const season: SeasonDates = {
    name,
    startDate: toLocalDate(start),
    endDate: toLocalDate(end),
    color,
  };
  if (weekCount !== undefined) {
    season.weekCount = weekCount;
  }
  return season;
}

/**
 * Seasons of the liturgical year that begins at Advent 1 of `year`.
 * Christmas runs through the Baptism of the Lord. The season after the
 * Epiphany (called "Epiphany" here for API compatibility) runs from the
 * following day through the day before Ash Wednesday. Easter runs through
 * Pentecost. Ordinary Time after Pentecost starts the next day and ends
 * the day before the following Advent 1.
 */
export function calculateSeasons(year: number): SeasonDates[] {
  const easter = calculateEasterCivil(year + 1);
  const advent1 = calculateAdvent1Civil(year);
  const ashWednesday = calculateAshWednesdayCivil(easter);
  const pentecost = calculatePentecostCivil(easter);
  const nextAdvent1 = calculateAdvent1Civil(year + 1);
  const baptism = calculateBaptismOfTheLordCivil(year + 1);

  return [
    seasonDatesFromCivil('Advent', advent1, civilDate(year, 12, 24), LiturgicalColor.PURPLE, 4),
    seasonDatesFromCivil(
      'Christmas',
      civilDate(year, 12, 25),
      baptism,
      LiturgicalColor.WHITE,
    ),
    seasonDatesFromCivil(
      'Epiphany',
      addCivilDays(baptism, 1),
      addCivilDays(ashWednesday, -1),
      LiturgicalColor.GREEN,
    ),
    seasonDatesFromCivil(
      'Lent',
      ashWednesday,
      addCivilDays(easter, -1),
      LiturgicalColor.PURPLE,
      6,
    ),
    seasonDatesFromCivil('Easter', easter, pentecost, LiturgicalColor.WHITE, 7),
    seasonDatesFromCivil(
      'Ordinary Time',
      addCivilDays(pentecost, 1),
      addCivilDays(nextAdvent1, -1),
      LiturgicalColor.GREEN,
    ),
  ];
}

export function calculateMoveableFeasts(year: number): LiturgicalDate[] {
  const easter = calculateEasterCivil(year);
  const ashWednesday = calculateAshWednesdayCivil(easter);
  const palmSunday = calculatePalmSundayCivil(easter);
  const pentecost = calculatePentecostCivil(easter);
  const trinity = calculateTrinitySundayCivil(easter);

  return [
    {
      date: toLocalDate(ashWednesday),
      name: 'Ash Wednesday',
      season: 'Lent',
      color: LiturgicalColor.PURPLE,
      rank: FeastRank.FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(palmSunday),
      name: 'Palm Sunday',
      season: 'Lent',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(addCivilDays(easter, -3)),
      name: 'Maundy Thursday',
      season: 'Lent',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(addCivilDays(easter, -2)),
      name: 'Good Friday',
      season: 'Lent',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(easter),
      name: 'Easter Sunday',
      season: 'Easter',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(addCivilDays(easter, 39)),
      name: 'Ascension Day',
      season: 'Easter',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(pentecost),
      name: 'Pentecost',
      season: 'Easter',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: toLocalDate(trinity),
      name: 'Trinity Sunday',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
  ];
}

export function calculateFixedFeasts(year: number): LiturgicalDate[] {
  const holyFamily = calculateHolyFamilyCivil(year);
  return [
    {
      date: toLocalDate(civilDate(year, 1, 1)),
      name: 'New Year\'s Day / Holy Name of Jesus',
      season: 'Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 1, 6)),
      name: 'Epiphany',
      season: 'Epiphany',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 2, 2)),
      name: 'Presentation of our Lord',
      season: 'Epiphany',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 3, 25)),
      name: 'Annunciation',
      season: 'Lent',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 8, 15)),
      name: 'Mary, Mother of our Lord',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 11, 1)),
      name: 'All Saints\' Day',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(holyFamily),
      name: 'Holy Family',
      season: 'Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: toLocalDate(civilDate(year, 12, 25)),
      name: 'Christmas Day',
      season: 'Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
  ];
}

/**
 * Generate a complete liturgical year beginning at Advent 1 of `year`.
 * The returned `year` is the ending civil year (year + 1), matching the
 * historical API.
 */
export function generateLiturgicalYear(year: number): LiturgicalYear {
  const easter = calculateEasterCivil(year + 1);
  return {
    year: year + 1,
    cycle: getLiturgicalCycle(year),
    advent1: toLocalDate(calculateAdvent1Civil(year)),
    christmas: toLocalDate(civilDate(year, 12, 25)),
    epiphany: toLocalDate(civilDate(year + 1, 1, 6)),
    ashWednesday: toLocalDate(calculateAshWednesdayCivil(easter)),
    palmSunday: toLocalDate(calculatePalmSundayCivil(easter)),
    easter: toLocalDate(easter),
    pentecost: toLocalDate(calculatePentecostCivil(easter)),
    seasons: calculateSeasons(year),
  };
}

/**
 * Season containing `date`. The optional `year` argument is ignored when
 * choosing the liturgical year; the date itself determines it, so Advent
 * and Christmas of the civil year are not missed.
 */
export function getSeasonForDate(date: Date, _year?: number): SeasonDates | null {
  const startYear = getLiturgicalYearStartYear(date);
  const seasons = calculateSeasons(startYear);
  const civil = fromLocalDate(date);
  for (const season of seasons) {
    if (isCivilInRange(civil, fromLocalDate(season.startDate), fromLocalDate(season.endDate))) {
      return season;
    }
  }
  return null;
}

/**
 * Civil date of the Sunday observed for a given Proper number in `easterYear`,
 * or null if that Proper is omitted (before Trinity, on or after Advent 1,
 * or colliding with Trinity or Christ the King).
 */
export function getProperSundayCivil(easterYear: number, properNumber: number): CivilDate | null {
  const anchor = RCL_PROPER_ANCHORS[properNumber];
  if (!anchor) {
    return null;
  }
  const candidate = sundayClosestTo(easterYear, anchor.month, anchor.day);
  const easter = calculateEasterCivil(easterYear);
  const trinity = calculateTrinitySundayCivil(easter);
  const advent1 = calculateAdvent1Civil(easterYear);
  const christTheKing = calculateChristTheKingCivil(easterYear);

  if (compareCivil(candidate, trinity) <= 0) {
    return null;
  }
  if (compareCivil(candidate, advent1) >= 0) {
    return null;
  }
  if (isSameCivil(candidate, christTheKing)) {
    return null;
  }
  return candidate;
}

/**
 * Proper number observed on a given date, or null when the date is not an
 * ordinary Proper Sunday (Trinity, Christ the King, or outside the window).
 */
export function getProperNumberForDate(date: Date): number | null {
  const civil = fromLocalDate(date);
  if (weekdayOf(civil) !== 0) {
    return null;
  }
  const easterYear = civil.month === 12 && civil.day >= 1 && compareCivil(civil, calculateAdvent1Civil(civil.year)) < 0
    ? civil.year
    : (compareCivil(civil, calculateAdvent1Civil(civil.year)) >= 0 ? civil.year + 1 : civil.year);

  for (const properNumber of Object.keys(RCL_PROPER_ANCHORS).map(Number)) {
    const observed = getProperSundayCivil(easterYear, properNumber);
    if (observed && isSameCivil(observed, civil)) {
      return properNumber;
    }
  }
  return null;
}

/**
 * After-Pentecost Sundays of civil year `year`, with RCL Proper numbers.
 * Trinity Sunday is omitted from the list (it precedes numbered Propers).
 * Christ the King is included as properNumber 29. A Proper that lands on
 * Trinity or Christ the King is recorded on that feast as omittedProperNumber.
 */
export function getOrdinaryTimeSundays(year: number): Array<{ date: Date; properNumber: number; omittedProperNumber?: number }> {
  const easter = calculateEasterCivil(year);
  const trinity = calculateTrinitySundayCivil(easter);
  const advent1 = calculateAdvent1Civil(year);
  const christTheKing = calculateChristTheKingCivil(year);
  const sundays: Array<{ date: Date; properNumber: number; omittedProperNumber?: number }> = [];

  const properByDate = new Map<string, number>();
  for (const key of Object.keys(RCL_PROPER_ANCHORS)) {
    const properNumber = Number(key);
    const anchor = RCL_PROPER_ANCHORS[properNumber];
    const candidate = sundayClosestTo(year, anchor.month, anchor.day);
    if (compareCivil(candidate, trinity) <= 0 || compareCivil(candidate, advent1) >= 0) {
      continue;
    }
    properByDate.set(formatCivilDate(candidate), properNumber);
  }

  let cursor = addCivilDays(trinity, 7);
  while (compareCivil(cursor, advent1) < 0) {
    const key = formatCivilDate(cursor);
    const collidingProper = properByDate.get(key) ?? null;
    if (isSameCivil(cursor, christTheKing)) {
      const entry: { date: Date; properNumber: number; omittedProperNumber?: number } = {
        date: toLocalDate(cursor),
        properNumber: 29,
      };
      if (collidingProper !== null) {
        entry.omittedProperNumber = collidingProper;
      }
      sundays.push(entry);
    } else if (collidingProper !== null) {
      sundays.push({
        date: toLocalDate(cursor),
        properNumber: collidingProper,
      });
    }
    cursor = addCivilDays(cursor, 7);
  }

  return sundays;
}

/**
 * Named observance on any civil date: principal feasts, Sunday series
 * (Advent, Lent, Easter, Sundays after Epiphany, Propers), or an unnamed
 * weekday that still carries the season and its color.
 */
export interface DayObservance {
  date: Date;
  name: string | null;
  season: string;
  color: LiturgicalColor;
  rank: FeastRank;
  properNumber: number | null;
  omittedProperNumber: number | null;
}

const CATHOLIC_TRADITIONS = new Set([
  'rc',
  'catholic',
  'cat',
  'roman-catholic',
]);

/**
 * Map the unified calendar's season name to the name used by a tradition.
 * After Pentecost the RCL, Episcopal, and BCP calendars say "Season after
 * Pentecost"; the Roman Catholic calendar keeps "Ordinary Time". The green
 * season after the Epiphany is "Epiphany" in the unified calendar and
 * "Ordinary Time" for Catholic use.
 */
export function seasonNameForTradition(
  seasonName: string,
  traditionId?: string | null,
): string {
  const tradition = (traditionId || 'rcl').toLowerCase();
  const isCatholic = CATHOLIC_TRADITIONS.has(tradition);
  if (seasonName === 'Ordinary Time' && !isCatholic) {
    return 'Season after Pentecost';
  }
  if (seasonName === 'Epiphany' && isCatholic) {
    return 'Ordinary Time';
  }
  return seasonName;
}

function ordinalWord(n: number): string {
  const words = [
    '',
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
  ];
  return words[n] || `${n}th`;
}

function feastOnCivilDate(civil: CivilDate): LiturgicalDate | undefined {
  const feasts = [
    ...calculateMoveableFeasts(civil.year),
    ...calculateFixedFeasts(civil.year),
  ];
  return feasts.find((feast) => isSameCivil(fromLocalDate(feast.date), civil));
}

/**
 * Observance on any date, applying feast precedence. Trinity Sunday (and
 * other principal feasts) win over a numbered Proper on the same date.
 * Ordinary weekdays have a null name but still report season and color.
 */
export function getObservanceForDate(date: Date): DayObservance {
  const civil = fromLocalDate(date);
  const season = getSeasonForDate(date);
  const seasonName = season?.name || 'Ordinary Time';
  const seasonColor = season?.color || LiturgicalColor.GREEN;
  const isSunday = weekdayOf(civil) === 0;

  const startYear = getLiturgicalYearStartYear(date);
  const easterYear = startYear + 1;
  const easter = calculateEasterCivil(easterYear);
  const advent1 = calculateAdvent1Civil(startYear);
  const baptism = calculateBaptismOfTheLordCivil(easterYear);
  const ashWednesday = calculateAshWednesdayCivil(easter);
  const transfiguration = addCivilDays(ashWednesday, -3);
  const christTheKing = calculateChristTheKingCivil(easterYear);
  const trinity = calculateTrinitySundayCivil(easter);

  const base = (overrides: Partial<DayObservance>): DayObservance => ({
    date: toLocalDate(civil),
    name: null,
    season: seasonName,
    color: seasonColor,
    rank: FeastRank.ORDINARY,
    properNumber: null,
    omittedProperNumber: null,
    ...overrides,
  });

  const feast = feastOnCivilDate(civil);
  // On Sundays the lectionary series name (Advent, Lent, Proper, and so
  // on) wins over a lesser fixed feast such as the Presentation. Principal
  // feasts still take precedence, which is how Trinity Sunday replaces
  // Proper 4 when they coincide.
  if (feast && (!isSunday || feast.rank === FeastRank.PRINCIPAL_FEAST)) {
    const omitted = isSunday && isSameCivil(civil, trinity)
      ? properNumberClosestTo(civil, easterYear)
      : null;
    return base({
      name: feast.name,
      season: feast.season,
      color: feast.color,
      rank: feast.rank,
      omittedProperNumber: omitted,
    });
  }

  if (isSameCivil(civil, baptism)) {
    return base({
      name: 'Baptism of the Lord',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
    });
  }

  if (isSameCivil(civil, transfiguration)) {
    return base({
      name: 'Transfiguration Sunday',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
    });
  }

  if (isSameCivil(civil, christTheKing)) {
    return base({
      name: 'Christ the King',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      properNumber: 29,
      omittedProperNumber: properNumberClosestTo(civil, easterYear),
    });
  }

  if (!isSunday) {
    return base({});
  }

  const christmas = civilDate(startYear, 12, 25);
  if (compareCivil(civil, advent1) >= 0 && compareCivil(civil, christmas) < 0) {
    const week = Math.floor(daysBetweenCivil(advent1, civil) / 7) + 1;
    return base({
      name: `${ordinalWord(week)} Sunday of Advent`,
      rank: week === 1 ? FeastRank.PRINCIPAL_FEAST : FeastRank.FEAST,
    });
  }

  const firstSundayAfterChristmas = (() => {
    const weekday = weekdayOf(christmas);
    return weekday === 0 ? addCivilDays(christmas, 7) : addCivilDays(christmas, 7 - weekday);
  })();
  if (isSameCivil(civil, firstSundayAfterChristmas) && !isSameCivil(civil, christmas)) {
    return base({
      name: 'First Sunday after Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
    });
  }

  if (
    compareCivil(civil, baptism) > 0
    && compareCivil(civil, transfiguration) < 0
  ) {
    // Baptism is the First Sunday after the Epiphany; this Sunday is the
    // next one or later, so add one to the week count from Baptism.
    const week = Math.floor(daysBetweenCivil(baptism, civil) / 7) + 1;
    return base({
      name: `${ordinalWord(week)} Sunday after Epiphany`,
    });
  }

  const lent1 = addCivilDays(ashWednesday, 4);
  const palmSunday = calculatePalmSundayCivil(easter);
  if (compareCivil(civil, lent1) >= 0 && compareCivil(civil, palmSunday) < 0) {
    const week = Math.floor(daysBetweenCivil(lent1, civil) / 7) + 1;
    return base({
      name: `${ordinalWord(week)} Sunday in Lent`,
    });
  }

  if (compareCivil(civil, easter) > 0 && compareCivil(civil, calculatePentecostCivil(easter)) < 0) {
    const week = Math.floor(daysBetweenCivil(easter, civil) / 7) + 1;
    return base({
      name: `${ordinalWord(week)} Sunday of Easter`,
    });
  }

  const properNumber = getProperNumberForDate(date);
  if (properNumber !== null) {
    return base({
      name: `Proper ${properNumber}`,
      properNumber,
    });
  }

  return base({
    name: seasonName || 'Sunday',
  });
}

/**
 * Observance on a Sunday, applying feast precedence. Trinity (and other
 * principal feasts) win over a numbered Proper on the same date.
 */
export function getSundayObservance(date: Date): SundayObservance | null {
  const civil = fromLocalDate(date);
  if (weekdayOf(civil) !== 0) {
    return null;
  }

  const observance = getObservanceForDate(date);
  return {
    date: observance.date,
    name: observance.name || observance.season || 'Sunday',
    properNumber: observance.properNumber,
    omittedProperNumber: observance.omittedProperNumber,
    rank: observance.rank,
  };
}

function properNumberClosestTo(date: CivilDate, year: number): number | null {
  for (const key of Object.keys(RCL_PROPER_ANCHORS)) {
    const properNumber = Number(key);
    const anchor = RCL_PROPER_ANCHORS[properNumber];
    const candidate = sundayClosestTo(year, anchor.month, anchor.day);
    if (isSameCivil(candidate, date)) {
      return properNumber;
    }
  }
  return null;
}

export function calculateWeeksInSeason(startDate: Date, endDate: Date): number {
  const diffDays = daysBetweenCivil(fromLocalDate(startDate), fromLocalDate(endDate));
  return Math.floor(diffDays / 7);
}

export function validateEasterCalculation(year: number): boolean {
  const easter = calculateEasterCivil(year);
  if (easter.month === 3 && easter.day >= 22) {
    return true;
  }
  if (easter.month === 4 && easter.day <= 25) {
    return true;
  }
  return false;
}

export const LiturgicalCalendar = {
  calculateEaster,
  calculateEasterCivil,
  calculateAdvent1,
  calculateAdvent1Civil,
  calculateAshWednesday,
  calculateAshWednesdayCivil,
  calculatePalmSunday,
  calculatePentecost,
  calculatePentecostCivil,
  calculateTrinitySundayCivil,
  calculateChristTheKingCivil,
  calculateBaptismOfTheLordCivil,
  calculateHolyFamilyCivil,
  calculateSundayAfterPentecost,
  getLiturgicalCycle,
  getLiturgicalCycleForDate,
  getDailyOfficeYear,
  getDailyOfficeYearForDate,
  getLiturgicalYearStartYear,
  calculateSeasons,
  calculateMoveableFeasts,
  calculateFixedFeasts,
  generateLiturgicalYear,
  getSeasonForDate,
  getOrdinaryTimeSundays,
  getProperSundayCivil,
  getProperNumberForDate,
  getObservanceForDate,
  getSundayObservance,
  seasonNameForTradition,
  calculateWeeksInSeason,
  validateEasterCalculation,
};

export default LiturgicalCalendar;
