/**
 * Comprehensive Liturgical Calendar Service
 * Implements full liturgical calendar calculations including:
 * - Easter calculation (Computus algorithm)
 * - All liturgical seasons with proper dates
 * - Liturgical year cycles (A, B, C)
 * - Proper numbers for Ordinary Time
 * - Moveable and fixed feasts
 */

// Types are defined locally in this file

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
   * Calculate Easter date using the Computus algorithm
   * Uses the Gregorian calendar algorithm (accurate for years 1583+)
   */
  public calculateEaster(year: number): LiturgicalDate {
    // Gregorian Calendar Easter Algorithm
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

    const easterDate = new Date(year, month - 1, day);
    
    return this.createLiturgicalDate(easterDate);
  }

  /**
   * Calculate all Easter-related moveable dates for a given year
   */
  public calculateEasterDates(year: number): EasterDates {
    const easter = this.calculateEaster(year);
    const easterDate = easter.date;

    return {
      easter,
      ashWednesday: this.createLiturgicalDate(this.addDays(easterDate, -46)),
      palmSunday: this.createLiturgicalDate(this.addDays(easterDate, -7)),
      maundyThursday: this.createLiturgicalDate(this.addDays(easterDate, -3)),
      goodFriday: this.createLiturgicalDate(this.addDays(easterDate, -2)),
      easterVigil: this.createLiturgicalDate(this.addDays(easterDate, -1)),
      ascension: this.createLiturgicalDate(this.addDays(easterDate, 39)),
      pentecost: this.createLiturgicalDate(this.addDays(easterDate, 49)),
      trinitySunday: this.createLiturgicalDate(this.addDays(easterDate, 56)),
      corpusChristi: this.createLiturgicalDate(this.addDays(easterDate, 60)),
      christTheKing: this.createLiturgicalDate(this.getChristTheKingDate(year)),
    };
  }

  /**
   * Determine the liturgical year cycle (A, B, or C)
   * Based on the year when the liturgical year begins (First Sunday of Advent)
   */
  public getLiturgicalCycle(year: number): 'A' | 'B' | 'C' {
    // The liturgical year begins with Advent, so we need to check
    // which civil year contains the First Sunday of Advent
    const firstAdvent = this.getFirstAdventDate(year);
    const liturgicalYearStart = firstAdvent.year;
    
    const remainder = liturgicalYearStart % 3;
    switch (remainder) {
    case 1: return 'B';
    case 2: return 'C';
    case 0: return 'A';
    default: return 'A';
    }
  }

  /**
   * Calculate all liturgical seasons for a given year
   */
  public calculateLiturgicalSeasons(year: number): LiturgicalSeasonData[] {
    const easterDates = this.calculateEasterDates(year);
    const seasons: LiturgicalSeasonData[] = [];

    // Advent (4 Sundays before Christmas)
    const firstAdvent = this.getFirstAdventDate(year);
    seasons.push({
      name: 'Advent',
      color: 'purple',
      startDate: firstAdvent,
      endDate: this.createLiturgicalDate(new Date(year, 11, 24)), // December 24
      weeks: 4,
      type: 'penitential',
    });

    // Christmas Season (Dec 25 - Baptism of the Lord)
    const baptismOfLord = this.getBaptismOfLordDate(year + 1);
    seasons.push({
      name: 'Christmas',
      color: 'white',
      startDate: this.createLiturgicalDate(new Date(year, 11, 25)), // December 25
      endDate: baptismOfLord,
      weeks: Math.ceil(this.daysBetween(new Date(year, 11, 25), baptismOfLord.date) / 7),
      type: 'festive',
    });

    // Ordinary Time I (After Epiphany until Ash Wednesday)
    const ordinaryTime1Start = this.createLiturgicalDate(this.addDays(baptismOfLord.date, 1));
    const ordinaryTime1End = this.createLiturgicalDate(this.addDays(easterDates.ashWednesday.date, -1));
    const ordinaryTime1Weeks = Math.floor(this.daysBetween(ordinaryTime1Start.date, ordinaryTime1End.date) / 7);
    
    seasons.push({
      name: 'Ordinary Time',
      color: 'green',
      startDate: ordinaryTime1Start,
      endDate: ordinaryTime1End,
      weeks: ordinaryTime1Weeks,
      type: 'ordinary',
      properNumbers: this.calculateOrdinaryTimePropers(year).beforeLent.weeks,
    });

    // Lent (Ash Wednesday to Easter Vigil)
    seasons.push({
      name: 'Lent',
      color: 'purple',
      startDate: easterDates.ashWednesday,
      endDate: this.createLiturgicalDate(this.addDays(easterDates.easterVigil.date, -1)),
      weeks: 6, // 6 Sundays in Lent
      type: 'penitential',
    });

    // Easter Season (Easter to Pentecost)
    seasons.push({
      name: 'Easter',
      color: 'white',
      startDate: easterDates.easter,
      endDate: easterDates.pentecost,
      weeks: 7, // 7 weeks of Easter
      type: 'festive',
    });

    // Ordinary Time II (After Pentecost until Advent)
    const ordinaryTime2Start = this.createLiturgicalDate(this.addDays(easterDates.pentecost.date, 1));
    const ordinaryTime2End = this.createLiturgicalDate(this.addDays(this.getFirstAdventDate(year).date, -1));
    const ordinaryTime2Weeks = Math.floor(this.daysBetween(ordinaryTime2Start.date, ordinaryTime2End.date) / 7);

    seasons.push({
      name: 'Ordinary Time',
      color: 'green',
      startDate: ordinaryTime2Start,
      endDate: ordinaryTime2End,
      weeks: ordinaryTime2Weeks,
      type: 'ordinary',
      properNumbers: this.calculateOrdinaryTimePropers(year).afterPentecost.weeks,
    });

    return seasons;
  }

  /**
   * Calculate Proper numbers for Ordinary Time
   * Handles the complex numbering system that accounts for varying Easter dates
   */
  public calculateOrdinaryTimePropers(year: number): OrdinaryTimeInfo {
    const easterDates = this.calculateEasterDates(year);
    const baptismOfLord = this.getBaptismOfLordDate(year);
    
    // Calculate weeks before Lent
    const daysBeforeLent = this.daysBetween(baptismOfLord.date, easterDates.ashWednesday.date) - 1;
    const weeksBeforeLent = Math.floor(daysBeforeLent / 7);
    
    // Ordinary Time before Lent starts with Week 2 (Week 1 is usually Baptism of the Lord)
    const beforeLentWeeks: number[] = [];
    for (let i = 2; i <= weeksBeforeLent + 1; i++) {
      beforeLentWeeks.push(i);
    }

    // Calculate weeks after Pentecost
    const pentecostDate = easterDates.pentecost.date;
    const firstAdventNext = this.getFirstAdventDate(year);
    const daysAfterPentecost = this.daysBetween(pentecostDate, firstAdventNext.date) - 1;
    const weeksAfterPentecost = Math.floor(daysAfterPentecost / 7);

    // Ordinary Time after Pentecost continues from where it left off
    const afterPentecostStart = beforeLentWeeks.length > 0 ? beforeLentWeeks[beforeLentWeeks.length - 1] + 1 : 2;
    const afterPentecostWeeks: number[] = [];
    
    // Calculate backwards from Christ the King (Week 34) to ensure proper alignment
    const totalOrdinaryWeeks = 34;
    // const remainingWeeks = totalOrdinaryWeeks - beforeLentWeeks.length;
    const startWeek = totalOrdinaryWeeks - weeksAfterPentecost + 1;
    
    for (let i = Math.max(afterPentecostStart, startWeek); i <= totalOrdinaryWeeks; i++) {
      afterPentecostWeeks.push(i);
    }

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

  /**
   * Calculate all special days (moveable and fixed feasts) for a given year
   */
  public calculateSpecialDays(year: number): SpecialDayData[] {
    const easterDates = this.calculateEasterDates(year);
    const specialDays: SpecialDayData[] = [];

    // Fixed Feasts
    this.addFixedFeasts(year, specialDays);
    
    // Moveable Feasts (based on Easter)
    this.addMoveableFeasts(easterDates, specialDays);

    // Sort by date
    return specialDays.sort((a, b) => a.date.date.getTime() - b.date.date.getTime());
  }

  /**
   * Get complete liturgical year information
   */
  public getLiturgicalYearInfo(year: number): LiturgicalYearInfo {
    return {
      year,
      cycle: this.getLiturgicalCycle(year),
      easterDates: this.calculateEasterDates(year),
      seasons: this.calculateLiturgicalSeasons(year),
      specialDays: this.calculateSpecialDays(year),
    };
  }

  /**
   * Find the liturgical season for a specific date
   */
  public getSeasonForDate(date: Date, year: number): LiturgicalSeasonData | null {
    const seasons = this.calculateLiturgicalSeasons(year);
    const targetDate = this.createLiturgicalDate(date);
    
    return seasons.find(season => 
      this.isDateInRange(targetDate, season.startDate, season.endDate),
    ) || null;
  }

  /**
   * Get the proper number for a specific date in Ordinary Time
   */
  public getProperNumber(date: Date, year: number): number | null {
    const season = this.getSeasonForDate(date, year);
    
    if (!season || season.name !== 'Ordinary Time' || !season.properNumbers) {
      return null;
    }

    const daysDiff = this.daysBetween(season.startDate.date, date);
    const weekNumber = Math.floor(daysDiff / 7);
    
    return season.properNumbers[weekNumber] || null;
  }

  // Private helper methods

  private createLiturgicalDate(date: Date): LiturgicalDate {
    return {
      date: new Date(date),
      dateString: date.toISOString().split('T')[0],
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private daysBetween(date1: Date, date2: Date): number {
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private isDateInRange(date: LiturgicalDate, start: LiturgicalDate, end: LiturgicalDate): boolean {
    return date.date >= start.date && date.date <= end.date;
  }

  private getFirstAdventDate(year: number): LiturgicalDate {
    // First Sunday of Advent is the 4th Sunday before Christmas
    const christmas = new Date(year, 11, 25); // December 25
    const christmasDay = christmas.getDay();
    
    // Calculate days to go back to get 4th Sunday before
    const daysBack = christmasDay === 0 ? 28 : 22 + christmasDay;
    
    return this.createLiturgicalDate(this.addDays(christmas, -daysBack));
  }

  private getBaptismOfLordDate(year: number): LiturgicalDate {
    // Baptism of the Lord is the Sunday after January 6 (Epiphany)
    // If January 6 is a Sunday, Baptism of the Lord is January 7
    const epiphany = new Date(year, 0, 6); // January 6
    const epiphanyDay = epiphany.getDay();
    
    const daysToAdd = epiphanyDay === 0 ? 1 : 7 - epiphanyDay + 1;
    
    return this.createLiturgicalDate(this.addDays(epiphany, daysToAdd));
  }

  private getChristTheKingDate(year: number): Date {
    // Christ the King is the last Sunday before Advent
    const firstAdvent = this.getFirstAdventDate(year);
    return this.addDays(firstAdvent.date, -7);
  }

  private addFixedFeasts(year: number, specialDays: SpecialDayData[]): void {
    const fixedFeasts = [
      { name: 'Mary, Mother of God', month: 0, day: 1, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Epiphany of the Lord', month: 0, day: 6, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Presentation of the Lord', month: 1, day: 2, type: 'feast', rank: 7, color: 'white' },
      { name: 'Saint Joseph', month: 2, day: 19, type: 'solemnity', rank: 8, color: 'white' },
      { name: 'Annunciation of the Lord', month: 2, day: 25, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Saints Peter and Paul', month: 5, day: 29, type: 'solemnity', rank: 8, color: 'red' },
      { name: 'Transfiguration of the Lord', month: 7, day: 6, type: 'feast', rank: 7, color: 'white' },
      { name: 'Assumption of Mary', month: 7, day: 15, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Exaltation of the Holy Cross', month: 8, day: 14, type: 'feast', rank: 7, color: 'red' },
      { name: 'All Saints', month: 10, day: 1, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'All Souls', month: 10, day: 2, type: 'commemoration', rank: 5, color: 'purple' },
      { name: 'Immaculate Conception', month: 11, day: 8, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Christmas Day', month: 11, day: 25, type: 'solemnity', rank: 10, color: 'white' },
      { name: 'Holy Family', month: 11, day: 30, type: 'feast', rank: 7, color: 'white' }, // Sunday after Christmas or Dec 30
    ];

    fixedFeasts.forEach(feast => {
      specialDays.push({
        name: feast.name,
        date: this.createLiturgicalDate(new Date(year, feast.month, feast.day)),
        type: feast.type as any,
        rank: feast.rank,
        color: feast.color,
        isMoveable: false,
      });
    });
  }

  private addMoveableFeasts(easterDates: EasterDates, specialDays: SpecialDayData[]): void {
    const moveableFeasts = [
      { name: 'Ash Wednesday', date: easterDates.ashWednesday, type: 'fast', rank: 8, color: 'purple' },
      { name: 'Palm Sunday', date: easterDates.palmSunday, type: 'feast', rank: 8, color: 'red' },
      { name: 'Maundy Thursday', date: easterDates.maundyThursday, type: 'feast', rank: 9, color: 'white' },
      { name: 'Good Friday', date: easterDates.goodFriday, type: 'fast', rank: 10, color: 'red' },
      { name: 'Easter Vigil', date: easterDates.easterVigil, type: 'solemnity', rank: 10, color: 'white' },
      { name: 'Easter Sunday', date: easterDates.easter, type: 'solemnity', rank: 10, color: 'white' },
      { name: 'Ascension of the Lord', date: easterDates.ascension, type: 'solemnity', rank: 9, color: 'white' },
      { name: 'Pentecost', date: easterDates.pentecost, type: 'solemnity', rank: 9, color: 'red' },
      { name: 'Trinity Sunday', date: easterDates.trinitySunday, type: 'solemnity', rank: 8, color: 'white' },
      { name: 'Corpus Christi', date: easterDates.corpusChristi, type: 'solemnity', rank: 8, color: 'white' },
      { name: 'Christ the King', date: easterDates.christTheKing, type: 'solemnity', rank: 8, color: 'white' },
    ];

    moveableFeasts.forEach(feast => {
      specialDays.push({
        name: feast.name,
        date: feast.date,
        type: feast.type as any,
        rank: feast.rank,
        color: feast.color,
        isMoveable: true,
      });
    });
  }
}