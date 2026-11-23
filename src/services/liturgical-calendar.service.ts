/**
 * Liturgical calendar service.
 *
 * This is a thin wrapper around the unified timezone-safe calendar in
 * src/utils/liturgical-calendar.ts. All date math happens there. The
 * service keeps the method shapes used by ReadingsService and importers.
 */

import {
  LiturgicalCalendar,
  calculateAdvent1Civil,
  calculateBaptismOfTheLordCivil,
  calculateChristTheKingCivil,
  calculateEasterCivil,
  calculateHolyFamilyCivil,
  getLiturgicalCycleForDate,
  getOrdinaryTimeSundays,
  getProperNumberForDate,
} from '../utils/liturgical-calendar';
import {
  CivilDate,
  addCivilDays,
  compareCivil,
  daysBetweenCivil,
  formatCivilDate,
  fromLocalDate,
  isCivilInRange,
  toLocalDate,
} from '../utils/civil-date';

export interface LiturgicalDate {
  date: Date;
  dateString: string;
  year: number;
  month: number;
  day: number;
}

export interface EasterDates {
  easter: LiturgicalDate;
  ashWednesday: LiturgicalDate;
  palmSunday: LiturgicalDate;
  maundyThursday: LiturgicalDate;
  goodFriday: LiturgicalDate;
  easterVigil: LiturgicalDate;
  ascension: LiturgicalDate;
  pentecost: LiturgicalDate;
  trinitySunday: LiturgicalDate;
  corpusChristi: LiturgicalDate;
  christTheKing: LiturgicalDate;
}

export interface LiturgicalYearInfo {
  year: number;
  cycle: 'A' | 'B' | 'C';
  easterDates: EasterDates;
  seasons: LiturgicalSeasonData[];
  specialDays: SpecialDayData[];
}

export interface LiturgicalSeasonData {
  name: string;
  color: string;
  startDate: LiturgicalDate;
  endDate: LiturgicalDate;
  weeks: number;
  type: 'ordinary' | 'penitential' | 'festive';
  properNumbers?: number[];
}

export interface SpecialDayData {
  name: string;
  date: LiturgicalDate;
  type: 'feast' | 'fast' | 'commemoration' | 'solemnity' | 'memorial';
  rank: number; // 1-10, higher = more important
  color: string;
  isMoveable: boolean;
}

export interface OrdinaryTimeInfo {
  beforeLent: {
    startWeek: number;
    endWeek: number;
    weeks: number[];
  };
  afterPentecost: {
    startWeek: number;
    endWeek: number;
    weeks: number[];
  };
}

export class LiturgicalCalendarService {

  /**
   * Easter Sunday of the given civil year.
   */
  public calculateEaster(year: number): LiturgicalDate {
    return this.fromCivil(calculateEasterCivil(year));
  }

  /**
   * All Easter-related moveable dates for a civil year, including
   * Christ the King of that same civil year (the Sunday before Advent).
   */
  public calculateEasterDates(year: number): EasterDates {
    const easter = calculateEasterCivil(year);
    return {
      easter: this.fromCivil(easter),
      ashWednesday: this.fromCivil(addCivilDays(easter, -46)),
      palmSunday: this.fromCivil(addCivilDays(easter, -7)),
      maundyThursday: this.fromCivil(addCivilDays(easter, -3)),
      goodFriday: this.fromCivil(addCivilDays(easter, -2)),
      easterVigil: this.fromCivil(addCivilDays(easter, -1)),
      ascension: this.fromCivil(addCivilDays(easter, 39)),
      pentecost: this.fromCivil(addCivilDays(easter, 49)),
      trinitySunday: this.fromCivil(addCivilDays(easter, 56)),
      corpusChristi: this.fromCivil(addCivilDays(easter, 60)),
      christTheKing: this.fromCivil(calculateChristTheKingCivil(year)),
    };
  }

  /**
   * RCL cycle that begins at Advent 1 of the given civil year.
   * Advent 2024 → C, Advent 2025 → A, Advent 2026 → B.
   */
  public getLiturgicalCycle(year: number): 'A' | 'B' | 'C' {
    return LiturgicalCalendar.getLiturgicalCycle(year);
  }

  /**
   * RCL cycle in effect on a specific civil date.
   */
  public getCycleForDate(date: Date): 'A' | 'B' | 'C' {
    return getLiturgicalCycleForDate(date);
  }

  /**
   * Seasons of the liturgical year that begins at Advent 1 of `year`.
   * Ordinary Time after the Epiphany uses Easter of year + 1.
   */
  public calculateLiturgicalSeasons(year: number): LiturgicalSeasonData[] {
    const easter = calculateEasterCivil(year + 1);
    const advent1 = calculateAdvent1Civil(year);
    const baptism = calculateBaptismOfTheLordCivil(year + 1);
    const ashWednesday = addCivilDays(easter, -46);
    const pentecost = addCivilDays(easter, 49);
    const nextAdvent = calculateAdvent1Civil(year + 1);
    const afterPentecostPropers = getOrdinaryTimeSundays(year + 1)
      .filter((sunday) => sunday.properNumber < 29)
      .map((sunday) => sunday.properNumber);

    const seasons: LiturgicalSeasonData[] = [
      {
        name: 'Advent',
        color: 'purple',
        startDate: this.fromCivil(advent1),
        endDate: this.fromCivil({ year, month: 12, day: 24 }),
        weeks: 4,
        type: 'penitential',
      },
      {
        name: 'Christmas',
        color: 'white',
        startDate: this.fromCivil({ year, month: 12, day: 25 }),
        endDate: this.fromCivil(baptism),
        weeks: Math.ceil(daysBetweenCivil({ year, month: 12, day: 25 }, baptism) / 7),
        type: 'festive',
      },
      {
        name: 'Ordinary Time',
        color: 'green',
        startDate: this.fromCivil(addCivilDays(baptism, 1)),
        endDate: this.fromCivil(addCivilDays(ashWednesday, -1)),
        weeks: Math.max(0, Math.floor(daysBetweenCivil(addCivilDays(baptism, 1), ashWednesday) / 7)),
        type: 'ordinary',
        properNumbers: this.calculateOrdinaryTimePropers(year + 1).beforeLent.weeks,
      },
      {
        name: 'Lent',
        color: 'purple',
        startDate: this.fromCivil(ashWednesday),
        endDate: this.fromCivil(addCivilDays(easter, -1)),
        weeks: 6,
        type: 'penitential',
      },
      {
        name: 'Easter',
        color: 'white',
        startDate: this.fromCivil(easter),
        endDate: this.fromCivil(pentecost),
        weeks: 7,
        type: 'festive',
      },
      {
        name: 'Ordinary Time',
        color: 'green',
        startDate: this.fromCivil(addCivilDays(pentecost, 1)),
        endDate: this.fromCivil(addCivilDays(nextAdvent, -1)),
        weeks: Math.max(0, Math.floor(daysBetweenCivil(addCivilDays(pentecost, 1), nextAdvent) / 7)),
        type: 'ordinary',
        properNumbers: afterPentecostPropers,
      },
    ];

    return seasons;
  }

  /**
   * Week numbers before Lent are the Sundays after the Epiphany (2, 3, …).
   * After Pentecost, week numbers are the observed RCL Proper numbers.
   */
  public calculateOrdinaryTimePropers(year: number): OrdinaryTimeInfo {
    const easter = calculateEasterCivil(year);
    const baptism = calculateBaptismOfTheLordCivil(year);
    const ashWednesday = addCivilDays(easter, -46);
    const transfiguration = addCivilDays(ashWednesday, -3);

    const beforeLentWeeks: number[] = [];
    // Week 1 after Epiphany is the Baptism of the Lord. Numbered Sundays
    // after that run until Transfiguration (last Sunday after Epiphany).
    let cursor = addCivilDays(baptism, 7);
    let week = 2;
    while (compareCivil(cursor, transfiguration) <= 0) {
      beforeLentWeeks.push(week);
      cursor = addCivilDays(cursor, 7);
      week += 1;
    }

    const afterPentecostWeeks = getOrdinaryTimeSundays(year)
      .filter((sunday) => sunday.properNumber < 29)
      .map((sunday) => sunday.properNumber);

    return {
      beforeLent: {
        startWeek: beforeLentWeeks.length > 0 ? beforeLentWeeks[0] : 2,
        endWeek: beforeLentWeeks.length > 0 ? beforeLentWeeks[beforeLentWeeks.length - 1] : 1,
        weeks: beforeLentWeeks,
      },
      afterPentecost: {
        startWeek: afterPentecostWeeks.length > 0 ? afterPentecostWeeks[0] : 2,
        endWeek: afterPentecostWeeks.length > 0 ? afterPentecostWeeks[afterPentecostWeeks.length - 1] : 34,
        weeks: afterPentecostWeeks,
      },
    };
  }

  public calculateSpecialDays(year: number): SpecialDayData[] {
    const easterDates = this.calculateEasterDates(year);
    const specialDays: SpecialDayData[] = [];
    this.addFixedFeasts(year, specialDays);
    this.addMoveableFeasts(easterDates, specialDays);
    return specialDays.sort((a, b) => a.date.date.getTime() - b.date.date.getTime());
  }

  /**
   * Information for the liturgical year beginning at Advent 1 of `year`.
   * Easter dates are those of year + 1, which fall in that liturgical year.
   */
  public getLiturgicalYearInfo(year: number): LiturgicalYearInfo {
    return {
      year,
      cycle: this.getLiturgicalCycle(year),
      easterDates: this.calculateEasterDates(year + 1),
      seasons: this.calculateLiturgicalSeasons(year),
      specialDays: this.calculateSpecialDays(year),
    };
  }

  public getSeasonForDate(date: Date, _year?: number): LiturgicalSeasonData | null {
    const startYear = LiturgicalCalendar.getLiturgicalYearStartYear(date);
    const seasons = this.calculateLiturgicalSeasons(startYear);
    const civil = fromLocalDate(date);
    return seasons.find((season) =>
      isCivilInRange(civil, fromLocalDate(season.startDate.date), fromLocalDate(season.endDate.date)),
    ) || null;
  }

  /**
   * RCL Proper number for a Sunday after Pentecost, or null on Trinity,
   * Christ the King, or any date that is not an observed Proper Sunday.
   */
  public getProperNumber(date: Date, _year?: number): number | null {
    return getProperNumberForDate(date);
  }

  private fromCivil(date: CivilDate): LiturgicalDate {
    return {
      date: toLocalDate(date),
      dateString: formatCivilDate(date),
      year: date.year,
      month: date.month,
      day: date.day,
    };
  }

  private addFixedFeasts(year: number, specialDays: SpecialDayData[]): void {
    const holyFamily = calculateHolyFamilyCivil(year);
    const baptism = calculateBaptismOfTheLordCivil(year);
    const fixedFeasts = [
      { name: 'Mary, Mother of God', date: { year, month: 1, day: 1 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Epiphany of the Lord', date: { year, month: 1, day: 6 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Baptism of the Lord', date: baptism, type: 'feast' as const, rank: 8, color: 'white' },
      { name: 'Presentation of the Lord', date: { year, month: 2, day: 2 }, type: 'feast' as const, rank: 7, color: 'white' },
      { name: 'Saint Joseph', date: { year, month: 3, day: 19 }, type: 'solemnity' as const, rank: 8, color: 'white' },
      { name: 'Annunciation of the Lord', date: { year, month: 3, day: 25 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Saints Peter and Paul', date: { year, month: 6, day: 29 }, type: 'solemnity' as const, rank: 8, color: 'red' },
      { name: 'Transfiguration of the Lord', date: { year, month: 8, day: 6 }, type: 'feast' as const, rank: 7, color: 'white' },
      { name: 'Assumption of Mary', date: { year, month: 8, day: 15 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Exaltation of the Holy Cross', date: { year, month: 9, day: 14 }, type: 'feast' as const, rank: 7, color: 'red' },
      { name: 'All Saints', date: { year, month: 11, day: 1 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'All Souls', date: { year, month: 11, day: 2 }, type: 'commemoration' as const, rank: 5, color: 'purple' },
      { name: 'Immaculate Conception', date: { year, month: 12, day: 8 }, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Christmas Day', date: { year, month: 12, day: 25 }, type: 'solemnity' as const, rank: 10, color: 'white' },
      { name: 'Holy Family', date: holyFamily, type: 'feast' as const, rank: 7, color: 'white' },
    ];

    fixedFeasts.forEach((feast) => {
      specialDays.push({
        name: feast.name,
        date: this.fromCivil(feast.date),
        type: feast.type,
        rank: feast.rank,
        color: feast.color,
        isMoveable: feast.name === 'Holy Family' || feast.name === 'Baptism of the Lord',
      });
    });
  }

  private addMoveableFeasts(easterDates: EasterDates, specialDays: SpecialDayData[]): void {
    const moveableFeasts = [
      { name: 'Ash Wednesday', date: easterDates.ashWednesday, type: 'fast' as const, rank: 8, color: 'purple' },
      { name: 'Palm Sunday', date: easterDates.palmSunday, type: 'feast' as const, rank: 8, color: 'red' },
      { name: 'Maundy Thursday', date: easterDates.maundyThursday, type: 'feast' as const, rank: 9, color: 'white' },
      { name: 'Good Friday', date: easterDates.goodFriday, type: 'fast' as const, rank: 10, color: 'red' },
      { name: 'Easter Vigil', date: easterDates.easterVigil, type: 'solemnity' as const, rank: 10, color: 'white' },
      { name: 'Easter Sunday', date: easterDates.easter, type: 'solemnity' as const, rank: 10, color: 'white' },
      { name: 'Ascension of the Lord', date: easterDates.ascension, type: 'solemnity' as const, rank: 9, color: 'white' },
      { name: 'Pentecost', date: easterDates.pentecost, type: 'solemnity' as const, rank: 9, color: 'red' },
      { name: 'Trinity Sunday', date: easterDates.trinitySunday, type: 'solemnity' as const, rank: 8, color: 'white' },
      { name: 'Corpus Christi', date: easterDates.corpusChristi, type: 'solemnity' as const, rank: 8, color: 'white' },
      { name: 'Christ the King', date: easterDates.christTheKing, type: 'solemnity' as const, rank: 8, color: 'white' },
    ];

    moveableFeasts.forEach((feast) => {
      specialDays.push({
        name: feast.name,
        date: feast.date,
        type: feast.type,
        rank: feast.rank,
        color: feast.color,
        isMoveable: true,
      });
    });
  }
}

