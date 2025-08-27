/**
 * Comprehensive Liturgical Calendar Date Calculator
 * 
 * This module provides utilities to calculate liturgical dates using the Computus algorithm
 * for Easter calculation and proper date mapping for all liturgical seasons following
 * the Revised Common Lectionary (RCL) and other traditions.
 */

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
  GOLD = 'gold'
}

export enum FeastRank {
  PRINCIPAL_FEAST = 'principal_feast',
  FEAST = 'feast',
  LESSER_FEAST = 'lesser_feast',
  COMMEMORATION = 'commemoration',
  ORDINARY = 'ordinary'
}

// =============================================================================
// CORE DATE CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate Easter date using the Computus algorithm (Western/Gregorian calendar)
 * @param year The calendar year
 * @returns Date object for Easter Sunday
 */
export function calculateEaster(year: number): Date {
  // Anonymous Gregorian algorithm (most accurate for years 1583-4099)
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
  
  return new Date(year, month - 1, day);
}

/**
 * Calculate the first Sunday of Advent (4th Sunday before Christmas)
 * @param year The calendar year
 * @returns Date object for the first Sunday of Advent
 */
export function calculateAdvent1(year: number): Date {
  const christmas = new Date(year, 11, 25); // December 25
  const christmasDay = christmas.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate days to subtract to get to the 4th Sunday before
  // The first Sunday of Advent is always between November 27 and December 3
  let daysToSubtract: number;
  if (christmasDay === 0) {
    daysToSubtract = 21; // 3 weeks exactly
  } else {
    daysToSubtract = 21 + christmasDay; // Adjust for day of week
  }
  
  const advent1 = new Date(year, 11, 25 - daysToSubtract);
  return advent1;
}

/**
 * Calculate Ash Wednesday (46 days before Easter, ensuring it falls on Wednesday)
 * @param easter Date object for Easter Sunday
 * @returns Date object for Ash Wednesday
 */
export function calculateAshWednesday(easter: Date): Date {
  // Start 46 days before Easter
  const ashWednesday = new Date(easter.getTime() - (46 * 24 * 60 * 60 * 1000));
  
  // Adjust to ensure it's a Wednesday (day 3)
  while (ashWednesday.getDay() !== 3) {
    if (ashWednesday.getDay() > 3) {
      // If it's Thursday, Friday, Saturday, go back
      ashWednesday.setDate(ashWednesday.getDate() - 1);
    } else {
      // If it's Sunday, Monday, Tuesday, go forward
      ashWednesday.setDate(ashWednesday.getDate() + 1);
    }
  }
  
  return ashWednesday;
}

/**
 * Calculate Palm Sunday (Sunday before Easter)
 * @param easter Date object for Easter Sunday
 * @returns Date object for Palm Sunday
 */
export function calculatePalmSunday(easter: Date): Date {
  const palmSunday = new Date(easter);
  palmSunday.setDate(easter.getDate() - 7);
  return palmSunday;
}

/**
 * Calculate Pentecost (50 days after Easter)
 * @param easter Date object for Easter Sunday
 * @returns Date object for Pentecost
 */
export function calculatePentecost(easter: Date): Date {
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49); // 49 days = 7 weeks
  return pentecost;
}

/**
 * Calculate the date for a specific Sunday after Pentecost
 * @param pentecost Date object for Pentecost
 * @param weekNumber Week number after Pentecost (1-based)
 * @returns Date object for the specified Sunday
 */
export function calculateSundayAfterPentecost(pentecost: Date, weekNumber: number): Date {
  const sunday = new Date(pentecost);
  sunday.setDate(pentecost.getDate() + (weekNumber * 7));
  return sunday;
}

/**
 * Get the liturgical year cycle (A, B, or C) for a given calendar year
 * The cycle is determined by the year modulo 3, with adjustments for the liturgical calendar
 * @param year Calendar year (the year in which the liturgical year ends)
 * @returns Liturgical cycle letter
 */
export function getLiturgicalCycle(year: number): 'A' | 'B' | 'C' {
  // Based on RCL pattern from web research:
  // The liturgical year that STARTS with Advent in a calendar year determines the cycle:
  // Advent 2024 starts Year C (2024-2025)
  // Advent 2025 starts Year A (2025-2026)
  // Advent 2026 starts Year B (2026-2027)
  // But the liturgical year is NAMED by its ending calendar year
  
  // So when we ask for cycle of liturgical year 2025 (which started Advent 2024),
  // we need to check the start year (2024) to get the cycle (C)
  const adventStartYear = year - 1;
  const cycle = adventStartYear % 3;
  switch (cycle) {
  case 0: return 'C'; // Advent 2024->Year C (liturgical year 2025)
  case 1: return 'A'; // Advent 2025->Year A (liturgical year 2026)
  case 2: return 'B'; // Advent 2026->Year B (liturgical year 2027)
  default: return 'A'; // fallback
  }
}

// =============================================================================
// SEASON CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate all liturgical seasons for a given year
 * @param year Calendar year
 * @returns Array of season date ranges
 */
export function calculateSeasons(year: number): SeasonDates[] {
  // For liturgical seasons, Easter and other moveable feasts are in the following calendar year
  const easter = calculateEaster(year + 1);
  const advent1 = calculateAdvent1(year);
  const ashWednesday = calculateAshWednesday(easter);
  const pentecost = calculatePentecost(easter);
  
  // Calculate next year's Advent to determine end of current liturgical year
  const nextAdvent1 = calculateAdvent1(year + 1);
  
  const seasons: SeasonDates[] = [
    // Advent
    {
      name: 'Advent',
      startDate: advent1,
      endDate: new Date(year, 11, 24), // Christmas Eve
      color: LiturgicalColor.PURPLE,
      weekCount: 4,
    },
    
    // Christmas Season
    {
      name: 'Christmas',
      startDate: new Date(year, 11, 25), // Christmas Day
      endDate: new Date(year + 1, 0, 5), // January 5 (Epiphany Eve)
      color: LiturgicalColor.WHITE,
    },
    
    // Epiphany Season
    {
      name: 'Epiphany',
      startDate: new Date(year + 1, 0, 6), // January 6
      endDate: new Date(ashWednesday.getTime() - 24 * 60 * 60 * 1000), // Day before Ash Wednesday
      color: LiturgicalColor.GREEN,
    },
    
    // Lent
    {
      name: 'Lent',
      startDate: ashWednesday,
      endDate: new Date(easter.getTime() - 24 * 60 * 60 * 1000), // Easter Eve
      color: LiturgicalColor.PURPLE,
      weekCount: 6,
    },
    
    // Easter Season
    {
      name: 'Easter',
      startDate: easter,
      endDate: new Date(pentecost.getTime() + 6 * 24 * 60 * 60 * 1000), // Saturday after Pentecost
      color: LiturgicalColor.WHITE,
      weekCount: 7,
    },
    
    // Ordinary Time (after Pentecost until Advent)
    {
      name: 'Ordinary Time',
      startDate: new Date(pentecost.getTime() + 7 * 24 * 60 * 60 * 1000), // Sunday after Pentecost
      endDate: new Date(nextAdvent1.getTime() - 24 * 60 * 60 * 1000), // Day before next Advent
      color: LiturgicalColor.GREEN,
    },
  ];
  
  return seasons;
}

// =============================================================================
// SPECIAL DAYS AND FEAST CALCULATIONS
// =============================================================================

/**
 * Calculate major moveable feasts (Easter-dependent)
 * @param year Calendar year
 * @returns Array of liturgical dates for moveable feasts
 */
export function calculateMoveableFeasts(year: number): LiturgicalDate[] {
  const easter = calculateEaster(year);
  const ashWednesday = calculateAshWednesday(easter);
  const palmSunday = calculatePalmSunday(easter);
  const pentecost = calculatePentecost(easter);
  
  const moveableFeasts: LiturgicalDate[] = [
    {
      date: ashWednesday,
      name: 'Ash Wednesday',
      season: 'Lent',
      color: LiturgicalColor.PURPLE,
      rank: FeastRank.FEAST,
      isMoveable: true,
    },
    {
      date: palmSunday,
      name: 'Palm Sunday',
      season: 'Lent',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: new Date(easter.getTime() - 3 * 24 * 60 * 60 * 1000),
      name: 'Maundy Thursday',
      season: 'Lent',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000),
      name: 'Good Friday',
      season: 'Lent',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: easter,
      name: 'Easter Sunday',
      season: 'Easter',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000),
      name: 'Ascension Day',
      season: 'Easter',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: pentecost,
      name: 'Pentecost',
      season: 'Easter',
      color: LiturgicalColor.RED,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
    {
      date: new Date(pentecost.getTime() + 7 * 24 * 60 * 60 * 1000),
      name: 'Trinity Sunday',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: true,
    },
  ];
  
  return moveableFeasts;
}

/**
 * Calculate fixed feasts (calendar-dependent)
 * @param year Calendar year
 * @returns Array of liturgical dates for fixed feasts
 */
export function calculateFixedFeasts(year: number): LiturgicalDate[] {
  const fixedFeasts: LiturgicalDate[] = [
    {
      date: new Date(year, 0, 1),
      name: 'New Year\'s Day / Holy Name of Jesus',
      season: 'Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 0, 6),
      name: 'Epiphany',
      season: 'Epiphany',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 1, 2),
      name: 'Presentation of our Lord',
      season: 'Epiphany',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 2, 25),
      name: 'Annunciation',
      season: 'Lent',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 7, 15),
      name: 'Mary, Mother of our Lord',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 10, 1),
      name: 'All Saints\' Day',
      season: 'Ordinary Time',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
    {
      date: new Date(year, 11, 25),
      name: 'Christmas Day',
      season: 'Christmas',
      color: LiturgicalColor.WHITE,
      rank: FeastRank.PRINCIPAL_FEAST,
      isMoveable: false,
    },
  ];
  
  return fixedFeasts;
}

// =============================================================================
// COMPREHENSIVE LITURGICAL YEAR GENERATOR
// =============================================================================

/**
 * Generate a complete liturgical year with all dates, seasons, and feast days
 * @param year Calendar year (the year in which the liturgical year begins)
 * @returns Complete LiturgicalYear object
 */
export function generateLiturgicalYear(year: number): LiturgicalYear {
  const easter = calculateEaster(year + 1); // Easter is in the next calendar year
  const advent1 = calculateAdvent1(year);
  const christmas = new Date(year, 11, 25);
  const epiphany = new Date(year + 1, 0, 6);
  const ashWednesday = calculateAshWednesday(easter);
  const palmSunday = calculatePalmSunday(easter);
  const pentecost = calculatePentecost(easter);
  const seasons = calculateSeasons(year);
  const cycle = getLiturgicalCycle(year + 1); // Cycle is based on the ending year
  
  return {
    year: year + 1, // Liturgical year is named by its ending calendar year
    cycle,
    advent1,
    christmas,
    epiphany,
    ashWednesday,
    palmSunday,
    easter,
    pentecost,
    seasons,
  };
}

/**
 * Get the liturgical season for a specific date
 * @param date The date to check
 * @param year The liturgical year
 * @returns Season information
 */
export function getSeasonForDate(date: Date, year: number): SeasonDates | null {
  const seasons = calculateSeasons(year - 1); // Liturgical year starts in previous calendar year
  
  for (const season of seasons) {
    if (date >= season.startDate && date <= season.endDate) {
      return season;
    }
  }
  
  return null;
}

/**
 * Get all Sundays in Ordinary Time for a liturgical year
 * @param year Calendar year
 * @returns Array of Sunday dates with their proper numbers
 */
export function getOrdinaryTimeSundays(year: number): Array<{ date: Date; properNumber: number }> {
  const pentecost = calculatePentecost(calculateEaster(year));
  const nextAdvent = calculateAdvent1(year);
  const sundays: Array<{ date: Date; properNumber: number }> = [];
  
  // First Sunday after Pentecost is Trinity Sunday, then we start counting Ordinary Time
  const currentDate = new Date(pentecost);
  currentDate.setDate(currentDate.getDate() + 14); // Two weeks after Pentecost (avoiding DST issues)
  let properNumber = 2; // Start with Proper 2 (first after Trinity)
  
  while (currentDate < nextAdvent) {
    // Ensure we're always on Sunday
    while (currentDate.getDay() !== 0) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentDate < nextAdvent) {
      sundays.push({
        date: new Date(currentDate),
        properNumber: properNumber,
      });
      
      currentDate.setDate(currentDate.getDate() + 7); // Add exactly 7 days
      properNumber++;
    }
  }
  
  return sundays;
}

/**
 * Calculate the number of weeks in a liturgical season
 * @param startDate Start date of the season
 * @param endDate End date of the season
 * @returns Number of complete weeks
 */
export function calculateWeeksInSeason(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Validate Easter calculation accuracy
 * @param year Year to validate
 * @returns True if calculation appears correct
 */
export function validateEasterCalculation(year: number): boolean {
  const easter = calculateEaster(year);
  const month = easter.getMonth() + 1; // getMonth() is 0-indexed
  const day = easter.getDate();
  
  // Easter must be between March 22 and April 25
  if (month === 3 && day >= 22) {
    return true;
  }
  if (month === 4 && day <= 25) {
    return true;
  }
  
  return false;
}

// =============================================================================
// EXPORT DEFAULT CALCULATOR INSTANCE
// =============================================================================

export const LiturgicalCalendar = {
  calculateEaster,
  calculateAdvent1,
  calculateAshWednesday,
  calculatePalmSunday,
  calculatePentecost,
  calculateSundayAfterPentecost,
  getLiturgicalCycle,
  calculateSeasons,
  calculateMoveableFeasts,
  calculateFixedFeasts,
  generateLiturgicalYear,
  getSeasonForDate,
  getOrdinaryTimeSundays,
  calculateWeeksInSeason,
  validateEasterCalculation,
};

export default LiturgicalCalendar;