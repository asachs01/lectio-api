#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config();

import { Reading, ReadingType } from '../models/reading.entity';
import { Season, LiturgicalColor } from '../models/season.entity';
import { LiturgicalYear, LiturgicalCycle } from '../models/liturgical-year.entity';
import { Tradition } from '../models/tradition.entity';
import { SpecialDay, SpecialDayType, SpecialDayRank } from '../models/special-day.entity';
import { LiturgicalCalendarService } from '../services/liturgical-calendar.service';

interface ReadingData {
  first: string;
  psalm: string;
  second: string;
  gospel: string;
}

interface SundayFeastData {
  id: string;
  name: string;
  date_pattern: string;
  readings: ReadingData;
}

interface SeasonData {
  name: string;
  sundays?: SundayFeastData[];
  feast_days?: SundayFeastData[];
}

interface RCLYearData {
  year: string;
  description: string;
  seasons: Record<string, SeasonData>;
}

/**
 * Liturgical date pattern mappings for calculating actual dates
 */
const DATE_PATTERN_DESCRIPTIONS = {
  // Advent patterns
  advent_1: 'First Sunday of Advent',
  advent_2: 'Second Sunday of Advent', 
  advent_3: 'Third Sunday of Advent',
  advent_4: 'Fourth Sunday of Advent',
  
  // Christmas patterns
  december_24: 'December 24 (Christmas Eve)',
  december_25: 'December 25 (Christmas Day)',
  christmas_1: 'First Sunday after Christmas',
  
  // Epiphany patterns
  january_6: 'January 6 (Epiphany)',
  baptism_lord: 'Baptism of the Lord (First Sunday after Epiphany)',
  epiphany_2: 'Second Sunday after Epiphany',
  epiphany_3: 'Third Sunday after Epiphany',
  transfiguration: 'Transfiguration Sunday (Last Sunday after Epiphany)',
  
  // Lent patterns
  ash_wednesday: 'Ash Wednesday',
  lent_1: 'First Sunday in Lent',
  lent_2: 'Second Sunday in Lent',
  lent_3: 'Third Sunday in Lent',
  lent_4: 'Fourth Sunday in Lent',
  lent_5: 'Fifth Sunday in Lent',
  palm_sunday: 'Palm Sunday',
  
  // Easter patterns
  easter_vigil: 'Easter Vigil',
  easter_day: 'Easter Day',
  easter_2: 'Second Sunday of Easter',
  easter_3: 'Third Sunday of Easter',
  easter_4: 'Fourth Sunday of Easter',
  easter_5: 'Fifth Sunday of Easter',
  easter_6: 'Sixth Sunday of Easter',
  ascension: 'Ascension Day',
  easter_7: 'Seventh Sunday of Easter',
  pentecost: 'Day of Pentecost',
  
  // Ordinary Time patterns
  trinity_sunday: 'Trinity Sunday',
  proper_4: 'Proper 4 (Ordinary 9)',
  proper_5: 'Proper 5 (Ordinary 10)',
  proper_6: 'Proper 6 (Ordinary 11)',
  proper_7: 'Proper 7 (Ordinary 12)',
  proper_8: 'Proper 8 (Ordinary 13)',
  proper_9: 'Proper 9 (Ordinary 14)',
  proper_10: 'Proper 10 (Ordinary 15)',
  proper_11: 'Proper 11 (Ordinary 16)',
  proper_12: 'Proper 12 (Ordinary 17)',
  proper_13: 'Proper 13 (Ordinary 18)',
  proper_14: 'Proper 14 (Ordinary 19)',
  proper_15: 'Proper 15 (Ordinary 20)',
  proper_16: 'Proper 16 (Ordinary 21)',
  proper_17: 'Proper 17 (Ordinary 22)',
  proper_18: 'Proper 18 (Ordinary 23)',
  proper_19: 'Proper 19 (Ordinary 24)',
  proper_20: 'Proper 20 (Ordinary 25)',
  proper_21: 'Proper 21 (Ordinary 26)',
  proper_22: 'Proper 22 (Ordinary 27)',
  proper_23: 'Proper 23 (Ordinary 28)',
  proper_24: 'Proper 24 (Ordinary 29)',
  proper_25: 'Proper 25 (Ordinary 30)',
  proper_26: 'Proper 26 (Ordinary 31)',
  proper_27: 'Proper 27 (Ordinary 32)',
  proper_28: 'Proper 28 (Ordinary 33)',
  christ_king: 'Christ the King Sunday',
};

/**
 * Season mappings from JSON keys to database names
 */
const SEASON_MAPPINGS = {
  advent: 'Advent',
  christmas: 'Christmas',
  epiphany: 'Epiphany',
  lent: 'Lent',
  easter: 'Easter',
  ordinary_time: 'Ordinary Time',
};

/**
 * Season colors mapping
 */
const SEASON_COLORS = {
  advent: LiturgicalColor.PURPLE,
  christmas: LiturgicalColor.WHITE,
  epiphany: LiturgicalColor.WHITE,
  lent: LiturgicalColor.PURPLE,
  easter: LiturgicalColor.WHITE,
  ordinary_time: LiturgicalColor.GREEN,
};

/**
 * Get the season order for sorting
 */
function getSeasonOrder(seasonKey: string): number {
  const order = {
    advent: 1,
    christmas: 2,
    epiphany: 3,
    lent: 4,
    easter: 5,
    ordinary_time: 6,
  };
  return order[seasonKey as keyof typeof order] || 99;
}

/**
 * Parse reading text to handle alternative readings
 */
function parseReadingText(readingText: string): { primary: string; alternative?: string } {
  if (readingText.includes(' OR ')) {
    const [primary, alternative] = readingText.split(' OR ');
    return { primary: primary.trim(), alternative: alternative.trim() };
  }
  return { primary: readingText.trim() };
}

/**
 * Load and parse RCL JSON data files
 */
function loadRCLData(): RCLYearData[] {
  const dataDir = path.join(__dirname, '../data');
  const years = ['A', 'B', 'C'];
  const rclData: RCLYearData[] = [];
  
  for (const year of years) {
    const filePath = path.join(dataDir, `rcl-year-${year.toLowerCase()}.json`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const yearData: RCLYearData = JSON.parse(fileContent);
      rclData.push(yearData);
      console.log(`Loaded RCL Year ${year} data from ${filePath}`);
    } else {
      console.warn(`Warning: RCL file not found: ${filePath}`);
    }
  }
  
  return rclData;
}

// Create a singleton instance of the liturgical calendar service
const liturgicalCalendarService = new LiturgicalCalendarService();

/**
 * Calculate the actual liturgical date for a given pattern and civil year
 * Uses proper liturgical calendar calculations
 *
 * @param datePattern The date pattern from the JSON file (e.g., 'advent_1', 'easter_day')
 * @param civilYear The civil year for which to calculate the date
 * @param liturgicalCycle The liturgical cycle (A, B, C) to determine which year this belongs to
 */
function calculateLiturgicalDate(datePattern: string, civilYear: number, _liturgicalCycle: 'A' | 'B' | 'C'): Date {
  // Get Easter dates for this year (many dates depend on Easter)
  const easterDates = liturgicalCalendarService.calculateEasterDates(civilYear);
  const easter = easterDates.easter.date;

  // Helper to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Helper to get the Sunday on or after a given date
  const getSundayOnOrAfter = (date: Date): Date => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      return date;
    }
    return addDays(date, 7 - dayOfWeek);
  };

  // Helper to get the nth Sunday after a given date
  const getNthSundayAfter = (date: Date, n: number): Date => {
    const firstSunday = getSundayOnOrAfter(addDays(date, 1));
    return addDays(firstSunday, (n - 1) * 7);
  };

  // Calculate First Sunday of Advent (4th Sunday before Christmas, or Sunday closest to Nov 30)
  const getFirstAdvent = (year: number): Date => {
    // First Sunday of Advent is the Sunday that falls between Nov 27 and Dec 3 inclusive
    // This is also the Sunday closest to November 30
    const nov30 = new Date(year, 10, 30); // November 30
    const dayOfWeek = nov30.getDay(); // 0 = Sunday

    if (dayOfWeek === 0) {
      // Nov 30 is a Sunday
      return nov30;
    } else if (dayOfWeek <= 3) {
      // Mon-Wed: Go back to the previous Sunday
      return addDays(nov30, -dayOfWeek);
    } else {
      // Thu-Sat: Go forward to the next Sunday
      return addDays(nov30, 7 - dayOfWeek);
    }
  };

  // Get Baptism of the Lord (Sunday after Jan 6, or Jan 7 if Jan 6 is Sunday)
  const getBaptismOfLord = (year: number): Date => {
    const epiphany = new Date(year, 0, 6);
    const epiphanyDay = epiphany.getDay();
    if (epiphanyDay === 0) {
      return new Date(year, 0, 7);
    }
    return addDays(epiphany, 7 - epiphanyDay);
  };

  // Calculate Transfiguration Sunday (Last Sunday after Epiphany, before Ash Wednesday)
  const getTransfiguration = (_year: number): Date => {
    const ashWed = easterDates.ashWednesday.date;
    // Go back to the Sunday before Ash Wednesday
    const daysBack = ashWed.getDay() === 0 ? 7 : ashWed.getDay();
    return addDays(ashWed, -daysBack);
  };

  // Calculate Christ the King (Last Sunday before Advent)
  const getChristTheKing = (year: number): Date => {
    const firstAdvent = getFirstAdvent(year);
    return addDays(firstAdvent, -7);
  };

  // Calculate Propers based on weeks after Pentecost
  // Proper 4 starts when the Sunday falls between May 29 - June 4
  // The Propers work backward from Christ the King (Proper 29 = Christ the King)
  const getProperDate = (properNumber: number, year: number): Date => {
    const christKing = getChristTheKing(year);
    // Christ the King is essentially Proper 29
    // So Proper 28 is 1 week before, Proper 27 is 2 weeks before, etc.
    const weeksBeforeChristKing = 29 - properNumber;
    return addDays(christKing, -weeksBeforeChristKing * 7);
  };

  // Map date patterns to actual date calculations
  switch (datePattern) {
  // Advent (in the year before the majority of the liturgical year)
  case 'advent_1':
    return getFirstAdvent(civilYear);
  case 'advent_2':
    return addDays(getFirstAdvent(civilYear), 7);
  case 'advent_3':
    return addDays(getFirstAdvent(civilYear), 14);
  case 'advent_4':
    return addDays(getFirstAdvent(civilYear), 21);

    // Christmas (fixed dates)
  case 'december_24':
    return new Date(civilYear, 11, 24);
  case 'december_25':
    return new Date(civilYear, 11, 25);
  case 'christmas_1': {
    // First Sunday after Christmas (Dec 26 - Jan 1)
    const christmasDate = new Date(civilYear, 11, 25);
    return getSundayOnOrAfter(addDays(christmasDate, 1));
  }

  // Epiphany
  case 'january_6':
    return new Date(civilYear + 1, 0, 6); // January 6 of the following year
  case 'baptism_lord':
    return getBaptismOfLord(civilYear + 1);
  case 'epiphany_2':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 2);
  case 'epiphany_3':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 3);
  case 'epiphany_4':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 4);
  case 'epiphany_5':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 5);
  case 'epiphany_6':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 6);
  case 'epiphany_7':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 7);
  case 'epiphany_8':
    return getNthSundayAfter(new Date(civilYear + 1, 0, 6), 8);
  case 'transfiguration':
    return getTransfiguration(civilYear + 1);

    // Lent (based on Easter)
  case 'ash_wednesday':
    return easterDates.ashWednesday.date;
  case 'lent_1':
    return addDays(easter, -42); // 6 weeks before Easter
  case 'lent_2':
    return addDays(easter, -35);
  case 'lent_3':
    return addDays(easter, -28);
  case 'lent_4':
    return addDays(easter, -21);
  case 'lent_5':
    return addDays(easter, -14);
  case 'palm_sunday':
    return easterDates.palmSunday.date;

    // Easter (based on Easter calculation)
  case 'easter_vigil':
    return easterDates.easterVigil.date;
  case 'easter_day':
    return easter;
  case 'easter_2':
    return addDays(easter, 7);
  case 'easter_3':
    return addDays(easter, 14);
  case 'easter_4':
    return addDays(easter, 21);
  case 'easter_5':
    return addDays(easter, 28);
  case 'easter_6':
    return addDays(easter, 35);
  case 'ascension':
    return easterDates.ascension.date;
  case 'easter_7':
    return addDays(easter, 42);
  case 'pentecost':
    return easterDates.pentecost.date;

    // Ordinary Time / Propers
  case 'trinity_sunday':
    return easterDates.trinitySunday.date;
  case 'proper_4':
    return getProperDate(4, civilYear + 1);
  case 'proper_5':
    return getProperDate(5, civilYear + 1);
  case 'proper_6':
    return getProperDate(6, civilYear + 1);
  case 'proper_7':
    return getProperDate(7, civilYear + 1);
  case 'proper_8':
    return getProperDate(8, civilYear + 1);
  case 'proper_9':
    return getProperDate(9, civilYear + 1);
  case 'proper_10':
    return getProperDate(10, civilYear + 1);
  case 'proper_11':
    return getProperDate(11, civilYear + 1);
  case 'proper_12':
    return getProperDate(12, civilYear + 1);
  case 'proper_13':
    return getProperDate(13, civilYear + 1);
  case 'proper_14':
    return getProperDate(14, civilYear + 1);
  case 'proper_15':
    return getProperDate(15, civilYear + 1);
  case 'proper_16':
    return getProperDate(16, civilYear + 1);
  case 'proper_17':
    return getProperDate(17, civilYear + 1);
  case 'proper_18':
    return getProperDate(18, civilYear + 1);
  case 'proper_19':
    return getProperDate(19, civilYear + 1);
  case 'proper_20':
    return getProperDate(20, civilYear + 1);
  case 'proper_21':
    return getProperDate(21, civilYear + 1);
  case 'proper_22':
    return getProperDate(22, civilYear + 1);
  case 'proper_23':
    return getProperDate(23, civilYear + 1);
  case 'proper_24':
    return getProperDate(24, civilYear + 1);
  case 'proper_25':
    return getProperDate(25, civilYear + 1);
  case 'proper_26':
    return getProperDate(26, civilYear + 1);
  case 'proper_27':
    return getProperDate(27, civilYear + 1);
  case 'proper_28':
    return getProperDate(28, civilYear + 1);
  case 'christ_king':
    return getChristTheKing(civilYear + 1);

  default:
    console.warn(`Unknown date pattern: ${datePattern}, using fallback`);
    return new Date(civilYear, 0, 1);
  }
}

/**
 * Get the civil year when a liturgical year cycle starts
 * e.g., Year A starting in 2025 begins with Advent in late November 2025
 *
 * For reference:
 * - Year A: 2025-2026, 2028-2029, etc. (year % 3 === 2 for Advent start year)
 * - Year B: 2026-2027, 2029-2030, etc. (year % 3 === 0 for Advent start year)
 * - Year C: 2024-2025, 2027-2028, etc. (year % 3 === 1 for Advent start year)
 */
function getCivilYearForCycle(cycle: 'A' | 'B' | 'C', targetYear: number): number {
  // Find the most recent year where this cycle started
  // Cycle pattern: A starts when (year % 3 === 2), B when (year % 3 === 0), C when (year % 3 === 1)
  const targetRemainder = cycle === 'A' ? 2 : cycle === 'B' ? 0 : 1;

  let year = targetYear;
  while (year % 3 !== targetRemainder) {
    year--;
  }
  return year;
}

/**
 * Create DataSource instance
 */
let AppDataSource: DataSource;

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lectionary_api',
    synchronize: false, // Schema should already exist
    logging: false,
    entities: [
      path.join(__dirname, '../models/*.entity.ts'),
    ],
  });
  await AppDataSource.initialize();
  console.log('Database connection initialized');
}

/**
 * Create or find RCL tradition
 */
async function createRCLTradition(): Promise<Tradition> {
  const traditionRepo = AppDataSource.getRepository(Tradition);
  
  let tradition = await traditionRepo.findOne({ 
    where: { name: 'Revised Common Lectionary' }, 
  });
  
  if (!tradition) {
    tradition = traditionRepo.create({
      name: 'Revised Common Lectionary',
      abbreviation: 'RCL',
      description: 'The Revised Common Lectionary used by many Protestant denominations',
    });
    await traditionRepo.save(tradition);
    console.log('Created RCL tradition');
  } else {
    console.log('Found existing RCL tradition');
  }
  
  return tradition;
}

/**
 * Create or find liturgical year
 */
async function createLiturgicalYear(year: string, tradition: Tradition): Promise<LiturgicalYear> {
  const yearRepo = AppDataSource.getRepository(LiturgicalYear);
  
  let liturgicalYear = await yearRepo.findOne({ 
    where: { 
      name: `Year ${year}`,
      traditionId: tradition.id,
    }, 
  });
  
  if (!liturgicalYear) {
    const currentYear = new Date().getFullYear();
    liturgicalYear = yearRepo.create({
      name: `Year ${year}`,
      cycle: year as LiturgicalCycle,
      year: currentYear, // Using current year as example
      startDate: new Date(currentYear, 10, 27), // Usually starts first Sunday of Advent
      endDate: new Date(currentYear + 1, 10, 26), // Ends Saturday before next Advent
      traditionId: tradition.id,
    });
    await yearRepo.save(liturgicalYear);
    console.log(`Created liturgical year: ${year}`);
  } else {
    console.log(`Found existing liturgical year: ${year}`);
  }
  
  return liturgicalYear;
}

/**
 * Create or find liturgical season
 */
async function createLiturgicalSeason(
  seasonKey: string,
  seasonData: SeasonData,
  liturgicalYear: LiturgicalYear,
  civilYear: number,
): Promise<Season> {
  const seasonRepo = AppDataSource.getRepository(Season);

  const seasonName = SEASON_MAPPINGS[seasonKey as keyof typeof SEASON_MAPPINGS];
  if (!seasonName) {
    throw new Error(`Unknown season key: ${seasonKey}`);
  }

  let season = await seasonRepo.findOne({
    where: {
      name: seasonName,
      liturgicalYearId: liturgicalYear.id,
    },
  });

  if (!season) {
    // Calculate proper start and end dates based on season
    const cycle = liturgicalYear.cycle as 'A' | 'B' | 'C';
    let startDate: Date;
    let endDate: Date;

    // Helper to add days to a date
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    switch (seasonKey) {
    case 'advent':
      startDate = calculateLiturgicalDate('advent_1', civilYear, cycle);
      endDate = new Date(civilYear, 11, 24); // Christmas Eve
      break;
    case 'christmas':
      startDate = new Date(civilYear, 11, 25); // Christmas Day
      endDate = calculateLiturgicalDate('baptism_lord', civilYear, cycle);
      break;
    case 'epiphany':
      startDate = addDays(calculateLiturgicalDate('baptism_lord', civilYear, cycle), 1);
      endDate = addDays(calculateLiturgicalDate('ash_wednesday', civilYear, cycle), -1);
      break;
    case 'lent':
      startDate = calculateLiturgicalDate('ash_wednesday', civilYear, cycle);
      endDate = addDays(calculateLiturgicalDate('easter_day', civilYear, cycle), -1);
      break;
    case 'easter':
      startDate = calculateLiturgicalDate('easter_day', civilYear, cycle);
      endDate = calculateLiturgicalDate('pentecost', civilYear, cycle);
      break;
    case 'ordinary_time':
      startDate = addDays(calculateLiturgicalDate('pentecost', civilYear, cycle), 1);
      // Christ the King is the last Sunday, Advent 1 starts the next Sunday
      endDate = addDays(calculateLiturgicalDate('christ_king', civilYear, cycle), 6);
      break;
    default:
      startDate = new Date(civilYear, 0, 1);
      endDate = new Date(civilYear, 11, 31);
    }

    season = seasonRepo.create({
      name: seasonName,
      description: seasonData.name,
      liturgicalYearId: liturgicalYear.id,
      startDate,
      endDate,
      color: SEASON_COLORS[seasonKey as keyof typeof SEASON_COLORS] || LiturgicalColor.GREEN,
      sortOrder: getSeasonOrder(seasonKey),
    });
    await seasonRepo.save(season);
    console.log(`Created season: ${seasonName} for Year ${liturgicalYear.cycle} (${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]})`);
  } else {
    console.log(`Found existing season: ${seasonName} for Year ${liturgicalYear.cycle}`);
  }

  return season;
}

/**
 * Create special day if needed
 */
async function createSpecialDay(
  sundayFeastData: SundayFeastData,
  liturgicalYear: LiturgicalYear,
  tradition: Tradition,
  civilYear: number,
): Promise<SpecialDay | null> {
  if (!sundayFeastData.name.includes('Christmas') &&
      !sundayFeastData.name.includes('Epiphany') &&
      !sundayFeastData.name.includes('Easter') &&
      !sundayFeastData.name.includes('Ash Wednesday') &&
      !sundayFeastData.name.includes('Palm Sunday') &&
      !sundayFeastData.name.includes('Ascension') &&
      !sundayFeastData.name.includes('Pentecost')) {
    return null; // Only create special days for major feasts
  }

  const specialDayRepo = AppDataSource.getRepository(SpecialDay);
  const cycle = liturgicalYear.cycle as 'A' | 'B' | 'C';

  const actualDate = calculateLiturgicalDate(sundayFeastData.date_pattern, civilYear, cycle);

  let specialDay = await specialDayRepo.findOne({
    where: {
      name: sundayFeastData.name,
      date: actualDate,
      traditionId: tradition.id,
    },
  });

  if (!specialDay) {
    specialDay = specialDayRepo.create({
      name: sundayFeastData.name,
      date: actualDate,
      type: SpecialDayType.FEAST,
      rank: SpecialDayRank.FEAST,
      description: DATE_PATTERN_DESCRIPTIONS[sundayFeastData.date_pattern as keyof typeof DATE_PATTERN_DESCRIPTIONS] || sundayFeastData.name,
      traditionId: tradition.id,
      year: liturgicalYear.year,
      isFeastDay: true,
      isMoveable: sundayFeastData.date_pattern.includes('easter') || sundayFeastData.date_pattern.includes('lent'),
    });
    await specialDayRepo.save(specialDay);
    console.log(`Created special day: ${sundayFeastData.name} on ${actualDate.toISOString().split('T')[0]}`);
  }

  return specialDay;
}

/**
 * Create lectionary reading
 */
async function createLectionaryReading(
  sundayFeastData: SundayFeastData,
  season: Season,
  liturgicalYear: LiturgicalYear,
  tradition: Tradition,
  civilYear: number,
  specialDay?: SpecialDay,
): Promise<void> {
  const readingRepo = AppDataSource.getRepository(Reading);
  const cycle = liturgicalYear.cycle as 'A' | 'B' | 'C';

  // Calculate actual liturgical date
  const actualDate = calculateLiturgicalDate(sundayFeastData.date_pattern, civilYear, cycle);
  
  // Parse each reading to handle alternatives
  const readings = [
    { type: ReadingType.FIRST, text: sundayFeastData.readings.first },
    { type: ReadingType.PSALM, text: sundayFeastData.readings.psalm },
    { type: ReadingType.SECOND, text: sundayFeastData.readings.second },
    { type: ReadingType.GOSPEL, text: sundayFeastData.readings.gospel },
  ];
  
  for (const reading of readings) {
    const parsed = parseReadingText(reading.text);

    // Create primary reading
    const existingReading = await readingRepo.findOne({
      where: {
        date: actualDate,
        readingType: reading.type,
        traditionId: tradition.id,
        isAlternative: false,
      },
    });

    if (!existingReading) {
      const newReading = readingRepo.create({
        date: actualDate,
        readingType: reading.type,
        scriptureReference: parsed.primary,
        text: null, // We don't have full text in this import
        translation: 'NRSV',
        readingOrder: Object.values(ReadingType).indexOf(reading.type) + 1,
        notes: `${sundayFeastData.name} - ${reading.type}`,
        isAlternative: false,
        traditionId: tradition.id,
        liturgicalYearId: liturgicalYear.id,
        seasonId: season.id,
        specialDayId: specialDay?.id || null,
        scriptureId: null, // Would need to be populated separately
      });
      await readingRepo.save(newReading);
    }

    // Create alternative reading if exists
    if (parsed.alternative) {
      const existingAltReading = await readingRepo.findOne({
        where: {
          date: actualDate,
          readingType: reading.type,
          traditionId: tradition.id,
          isAlternative: true,
        },
      });

      if (!existingAltReading) {
        const altReading = readingRepo.create({
          date: actualDate,
          readingType: reading.type,
          scriptureReference: parsed.alternative,
          text: null,
          translation: 'NRSV',
          readingOrder: Object.values(ReadingType).indexOf(reading.type) + 1,
          notes: `${sundayFeastData.name} - ${reading.type} (Alternative)`,
          isAlternative: true,
          traditionId: tradition.id,
          liturgicalYearId: liturgicalYear.id,
          seasonId: season.id,
          specialDayId: specialDay?.id || null,
          scriptureId: null,
        });
        await readingRepo.save(altReading);
      }
    }
  }

  console.log(`Created readings for: ${sundayFeastData.name} on ${actualDate.toISOString().split('T')[0]} (${sundayFeastData.date_pattern})`);
}

/**
 * Import all RCL data
 */
async function importRCLData(): Promise<void> {
  try {
    console.log('Starting RCL data import...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Create or find RCL tradition
    const tradition = await createRCLTradition();
    
    // Load RCL data files
    const rclData = loadRCLData();
    
    if (rclData.length === 0) {
      throw new Error('No RCL data files found');
    }
    
    // Process each year
    for (const yearData of rclData) {
      console.log(`\nProcessing RCL Year ${yearData.year}...`);

      // Calculate the civil year when this liturgical cycle starts
      // For Year A starting in 2025, Advent begins in late November 2025
      const currentYear = new Date().getFullYear();
      const cycle = yearData.year as 'A' | 'B' | 'C';
      const civilYear = getCivilYearForCycle(cycle, currentYear);
      console.log(`  Civil year for Year ${cycle}: ${civilYear} (Advent ${civilYear} through Christ the King ${civilYear + 1})`);

      // Create liturgical year
      const liturgicalYear = await createLiturgicalYear(yearData.year, tradition);

      // Process each season
      const seasonKeys = Object.keys(yearData.seasons).sort((a, b) => {
        return getSeasonOrder(a) - getSeasonOrder(b);
      });

      for (const seasonKey of seasonKeys) {
        const seasonData = yearData.seasons[seasonKey];
        console.log(`\n  Processing season: ${seasonData.name}...`);

        // Create season with proper date calculations
        const season = await createLiturgicalSeason(seasonKey, seasonData, liturgicalYear, civilYear);

        // Process regular Sundays
        if (seasonData.sundays) {
          for (const sunday of seasonData.sundays) {
            const specialDay = await createSpecialDay(sunday, liturgicalYear, tradition, civilYear);
            await createLectionaryReading(sunday, season, liturgicalYear, tradition, civilYear, specialDay || undefined);
          }
        }

        // Process feast days
        if (seasonData.feast_days) {
          for (const feastDay of seasonData.feast_days) {
            const specialDay = await createSpecialDay(feastDay, liturgicalYear, tradition, civilYear);
            await createLectionaryReading(feastDay, season, liturgicalYear, tradition, civilYear, specialDay || undefined);
          }
        }
      }

      console.log(`Completed RCL Year ${yearData.year}`);
    }
    
    console.log('\n✅ RCL data import completed successfully!');
    
    // Print summary statistics
    const readingRepo = AppDataSource.getRepository(Reading);
    const seasonRepo = AppDataSource.getRepository(Season);
    const yearRepo = AppDataSource.getRepository(LiturgicalYear);
    const specialDayRepo = AppDataSource.getRepository(SpecialDay);
    
    const totalYears = await yearRepo.count();
    const totalSeasons = await seasonRepo.count();
    const totalReadings = await readingRepo.count();
    const totalSpecialDays = await specialDayRepo.count();
    
    console.log('\n📊 Import Summary:');
    console.log(`   Liturgical Years: ${totalYears}`);
    console.log(`   Seasons: ${totalSeasons}`);
    console.log(`   Total Readings: ${totalReadings}`);
    console.log(`   Special Days: ${totalSpecialDays}`);
    
  } catch (error) {
    console.error('❌ Error importing RCL data:', error);
    throw error;
  }
}

/**
 * Verify specific reading (like Proper 16, Year C for August 25, 2025)
 */
async function verifySpecificReading(): Promise<void> {
  const readingRepo = AppDataSource.getRepository(Reading);
  
  // Check for Proper 16, Year C readings using query builder
  const proper16CReadings = await readingRepo.createQueryBuilder('reading')
    .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
    .leftJoinAndSelect('reading.season', 'season')
    .where('liturgicalYear.cycle = :cycle', { cycle: LiturgicalCycle.C })
    .andWhere('reading.notes LIKE :pattern', { pattern: '%Proper 16%' })
    .limit(10)
    .getMany();
  
  if (proper16CReadings.length > 0) {
    console.log('\n🔍 Verification - Proper 16, Year C readings found:');
    proper16CReadings.forEach(reading => {
      console.log(`   ${reading.readingType}: ${reading.scriptureReference} ${reading.isAlternative ? '(Alt)' : ''}`);
    });
    
    // Expected readings for Proper 16, Year C:
    console.log('\n📖 Expected readings for Proper 16, Year C (August 25, 2025):');
    console.log('   First: Jeremiah 1:4-10 OR Isaiah 58:9b-14');
    console.log('   Psalm: Psalm 71:1-6 OR Psalm 103:1-8');
    console.log('   Second: Hebrews 12:18-29');
    console.log('   Gospel: Luke 13:10-17');
  } else {
    console.log('❌ Could not find Proper 16, Year C readings');
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await importRCLData();
    await verifySpecificReading();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { importRCLData, verifySpecificReading };