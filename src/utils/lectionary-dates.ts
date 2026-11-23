/**
 * Timezone-safe mapping from lectionary date patterns to civil dates.
 * Used by the RCL and Catholic importers. Returns null when a Sunday
 * or feast should be omitted (out of season, or a principal feast takes
 * precedence).
 */

import {
  CivilDate,
  addCivilDays,
  civilDate,
  compareCivil,
  formatCivilDate,
  isSameCivil,
  weekdayOf,
} from './civil-date';
import {
  calculateAdvent1Civil,
  calculateAshWednesdayCivil,
  calculateBaptismOfTheLordCivil,
  calculateChristTheKingCivil,
  calculateEasterCivil,
  calculateHolyFamilyCivil,
  calculatePentecostCivil,
  calculateTrinitySundayCivil,
  getProperSundayCivil,
} from './liturgical-calendar';

function sundayAfter(date: CivilDate): CivilDate {
  const weekday = weekdayOf(date);
  const ahead = weekday === 0 ? 7 : 7 - weekday;
  return addCivilDays(date, ahead);
}

/**
 * Resolve a date_pattern from the RCL or Catholic JSON files.
 * `adventYear` is the civil year of Advent 1 for that liturgical year.
 */
export function resolveLectionaryDate(
  datePattern: string,
  adventYear: number,
): CivilDate | null {
  const easterYear = adventYear + 1;
  const easter = calculateEasterCivil(easterYear);
  const advent1 = calculateAdvent1Civil(adventYear);
  const nextAdvent = calculateAdvent1Civil(easterYear);
  const ashWednesday = calculateAshWednesdayCivil(easter);
  const baptism = calculateBaptismOfTheLordCivil(easterYear);
  const transfiguration = addCivilDays(ashWednesday, -3);
  const trinity = calculateTrinitySundayCivil(easter);
  const pentecost = calculatePentecostCivil(easter);
  const christTheKing = calculateChristTheKingCivil(easterYear);

  const fixedInAdventYear: Record<string, [number, number, number]> = {
    december_24: [adventYear, 12, 24],
    december_25: [adventYear, 12, 25],
    december_8: [adventYear, 12, 8],
  };
  if (fixedInAdventYear[datePattern]) {
    const [y, m, d] = fixedInAdventYear[datePattern];
    return civilDate(y, m, d);
  }

  const fixedInEasterYear: Record<string, [number, number]> = {
    january_1: [1, 1],
    january_6: [1, 6],
    february_2: [2, 2],
    march_25: [3, 25],
    august_14: [8, 14],
    august_15: [8, 15],
    november_1: [11, 1],
    november_2: [11, 2],
  };
  if (fixedInEasterYear[datePattern]) {
    const [m, d] = fixedInEasterYear[datePattern];
    return civilDate(easterYear, m, d);
  }

  if (datePattern === 'advent_1') {
    return advent1;
  }
  const adventWeek = datePattern.match(/^advent_([2-4])$/);
  if (adventWeek) {
    return addCivilDays(advent1, (Number(adventWeek[1]) - 1) * 7);
  }

  if (datePattern === 'christmas_1') {
    // RCL: first Sunday after Christmas. Catholic callers that want Holy
    // Family when Christmas is Sunday should use 'holy_family'.
    return sundayAfter(civilDate(adventYear, 12, 25));
  }
  if (datePattern === 'holy_family') {
    return calculateHolyFamilyCivil(adventYear);
  }

  if (datePattern === 'baptism_lord') {
    return baptism;
  }
  const epiphanyWeek = datePattern.match(/^epiphany_([2-9])$/);
  if (epiphanyWeek) {
    const sunday = addCivilDays(baptism, (Number(epiphanyWeek[1]) - 1) * 7);
    // Only observed between Baptism and Transfiguration (exclusive of Transfiguration).
    if (compareCivil(sunday, transfiguration) >= 0) {
      return null;
    }
    return sunday;
  }
  if (datePattern === 'transfiguration') {
    return transfiguration;
  }

  if (datePattern === 'ash_wednesday') {
    return ashWednesday;
  }
  if (datePattern === 'lent_1') {
    return addCivilDays(ashWednesday, 4);
  }
  const lentWeek = datePattern.match(/^lent_([2-5])$/);
  if (lentWeek) {
    // Lent 2 is 35 days before Easter, Lent 5 is 14 days before.
    const weeksBeforeEaster = 7 - Number(lentWeek[1]);
    return addCivilDays(easter, -(weeksBeforeEaster * 7));
  }

  if (datePattern === 'palm_sunday') {
    return addCivilDays(easter, -7);
  }
  if (datePattern === 'holy_thursday' || datePattern === 'maundy_thursday') {
    return addCivilDays(easter, -3);
  }
  if (datePattern === 'good_friday') {
    return addCivilDays(easter, -2);
  }
  if (datePattern === 'easter_vigil') {
    return addCivilDays(easter, -1);
  }
  if (datePattern === 'easter_day' || datePattern === 'easter_sunday') {
    return easter;
  }
  const easterWeek = datePattern.match(/^easter_([2-7])$/);
  if (easterWeek) {
    return addCivilDays(easter, (Number(easterWeek[1]) - 1) * 7);
  }
  if (datePattern === 'ascension') {
    return addCivilDays(easter, 39);
  }
  if (datePattern === 'pentecost_vigil') {
    return addCivilDays(easter, 48);
  }
  if (datePattern === 'pentecost') {
    return pentecost;
  }
  if (datePattern === 'trinity_sunday') {
    return trinity;
  }
  if (datePattern === 'corpus_christi') {
    // In the United States Corpus Christi is observed on the Sunday after
    // Trinity (63 days after Easter).
    return addCivilDays(easter, 63);
  }
  if (datePattern === 'sacred_heart') {
    // Friday of the week after Corpus Christi (68 days after Easter).
    return addCivilDays(easter, 68);
  }
  if (datePattern === 'christ_king') {
    return christTheKing;
  }

  const proper = datePattern.match(/^proper_(\d+)$/);
  if (proper) {
    return getProperSundayCivil(easterYear, Number(proper[1]));
  }

  const ordinary = datePattern.match(/^ordinary_(\d+)$/);
  if (ordinary) {
    return resolveCatholicOrdinarySunday(Number(ordinary[1]), {
      baptism,
      ashWednesday,
      pentecost,
      trinity,
      christTheKing,
      nextAdvent,
    });
  }

  return null;
}

function resolveCatholicOrdinarySunday(
  weekNum: number,
  dates: {
    baptism: CivilDate;
    ashWednesday: CivilDate;
    pentecost: CivilDate;
    trinity: CivilDate;
    christTheKing: CivilDate;
    nextAdvent: CivilDate;
  },
): CivilDate | null {
  // Sundays after the Baptism of the Lord and before Ash Wednesday, starting
  // at week 2 (week 1 is displaced by the Baptism).
  const preLentSunday = addCivilDays(dates.baptism, (weekNum - 1) * 7);
  if (compareCivil(preLentSunday, dates.ashWednesday) < 0) {
    return preLentSunday;
  }

  // After Pentecost, weeks are counted backward so Christ the King is week 34.
  const fromEnd = addCivilDays(dates.christTheKing, -(34 - weekNum) * 7);
  if (compareCivil(fromEnd, dates.pentecost) <= 0) {
    return null;
  }
  if (isSameCivil(fromEnd, dates.trinity)) {
    return null;
  }
  if (compareCivil(fromEnd, dates.nextAdvent) >= 0) {
    return null;
  }
  return fromEnd;
}

export function formatLectionaryDate(date: CivilDate): string {
  return formatCivilDate(date);
}

/** Advent years whose cycle letters we seed by default. */
export const DEFAULT_SEED_ADVENT_YEARS: number[] = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function cycleForAdventYear(adventYear: number): 'A' | 'B' | 'C' {
  const remainder = ((adventYear % 3) + 3) % 3;
  return (['A', 'B', 'C'] as const)[remainder];
}

