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
import { LiturgicalCalendar } from '../utils/liturgical-calendar';

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

interface CatholicYearData {
  year: string;
  description: string;
  tradition: string;
  seasons: Record<string, SeasonData>;
}

/**
 * Map date patterns to actual liturgical dates for Catholic calendar
 */
function calculateCatholicLiturgicalDate(datePattern: string, liturgicalYear: number, cycle: string): Date {

  // Fixed dates
  if (datePattern === 'december_24') {
    return new Date(liturgicalYear, 11, 24);
  }
  if (datePattern === 'december_25') {
    return new Date(liturgicalYear, 11, 25);
  }
  if (datePattern === 'january_1') {
    return new Date(liturgicalYear + 1, 0, 1);
  }
  if (datePattern === 'january_6') {
    return new Date(liturgicalYear + 1, 0, 6);
  }
  if (datePattern === 'february_2') {
    return new Date(liturgicalYear + 1, 1, 2);
  }
  if (datePattern === 'march_25') {
    return new Date(liturgicalYear + 1, 2, 25);
  }
  if (datePattern === 'august_14') {
    return new Date(liturgicalYear + 1, 7, 14);
  }
  if (datePattern === 'august_15') {
    return new Date(liturgicalYear + 1, 7, 15);
  }
  if (datePattern === 'november_1') {
    return new Date(liturgicalYear + 1, 10, 1);
  }
  if (datePattern === 'november_2') {
    return new Date(liturgicalYear + 1, 10, 2);
  }
  if (datePattern === 'december_8') {
    return new Date(liturgicalYear, 11, 8);
  }

  // Advent Sundays
  if (datePattern === 'advent_1') {
    return LiturgicalCalendar.calculateAdvent1(liturgicalYear);
  }
  if (datePattern === 'advent_2') {
    const advent1 = LiturgicalCalendar.calculateAdvent1(liturgicalYear);
    return new Date(advent1.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'advent_3') {
    const advent1 = LiturgicalCalendar.calculateAdvent1(liturgicalYear);
    return new Date(advent1.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'advent_4') {
    const advent1 = LiturgicalCalendar.calculateAdvent1(liturgicalYear);
    return new Date(advent1.getTime() + 21 * 24 * 60 * 60 * 1000);
  }

  // Christmas Season
  if (datePattern === 'christmas_1') {
    // First Sunday after Christmas (Holy Family)
    const christmas = new Date(liturgicalYear, 11, 25);
    const daysUntilSunday = (7 - christmas.getDay()) % 7 || 7;
    return new Date(christmas.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  }

  // Calculate Easter for the liturgical year (which starts in Advent of previous calendar year)
  const easterYear = liturgicalYear + 1; // Easter is in the calendar year after liturgical year starts
  const easter = LiturgicalCalendar.calculateEaster(easterYear);

  // Epiphany Season
  if (datePattern === 'baptism_lord') {
    // Sunday after Epiphany (in US, or January 6 in other countries)
    const epiphany = new Date(easterYear, 0, 6);
    const daysUntilSunday = (7 - epiphany.getDay()) % 7 || 7;
    return new Date(epiphany.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  }

  // Lent
  if (datePattern === 'ash_wednesday') {
    return new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
  }

  if (datePattern === 'lent_1') {
    const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
    return new Date(ashWednesday.getTime() + 4 * 24 * 60 * 60 * 1000);
  }

  if (datePattern === 'lent_2') {
    return new Date(easter.getTime() - 35 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'lent_3') {
    return new Date(easter.getTime() - 28 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'lent_4') {
    return new Date(easter.getTime() - 21 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'lent_5') {
    return new Date(easter.getTime() - 14 * 24 * 60 * 60 * 1000);
  }

  // Holy Week
  if (datePattern === 'palm_sunday') {
    return new Date(easter.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'holy_thursday') {
    return new Date(easter.getTime() - 3 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'good_friday') {
    return new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
  }

  // Easter Season
  if (datePattern === 'easter_vigil') {
    return new Date(easter.getTime() - 1 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_sunday') {
    return easter;
  }
  if (datePattern === 'easter_2') {
    return new Date(easter.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_3') {
    return new Date(easter.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_4') {
    return new Date(easter.getTime() + 21 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_5') {
    return new Date(easter.getTime() + 28 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_6') {
    return new Date(easter.getTime() + 35 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'ascension') {
    return new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_7') {
    return new Date(easter.getTime() + 42 * 24 * 60 * 60 * 1000);
  }

  // Pentecost
  if (datePattern === 'pentecost_vigil') {
    return new Date(easter.getTime() + 48 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'pentecost') {
    return new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
  }

  // Post-Pentecost Solemnities
  if (datePattern === 'trinity_sunday') {
    return new Date(easter.getTime() + 56 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'corpus_christi') {
    return new Date(easter.getTime() + 63 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'sacred_heart') {
    // Friday after Corpus Christi (19 days after Pentecost)
    return new Date(easter.getTime() + 68 * 24 * 60 * 60 * 1000);
  }

  // Ordinary Time Sundays (Catholic uses numbers, not Propers)
  const ordinaryTimeMap: { [key: string]: number } = {
    ordinary_2: 2,
    ordinary_3: 3,
    ordinary_4: 4,
    ordinary_5: 5,
    ordinary_6: 6,
    ordinary_7: 7,
    ordinary_8: 8,
    ordinary_9: 9,
    ordinary_10: 10,
    ordinary_11: 11,
    ordinary_12: 12,
    ordinary_13: 13,
    ordinary_14: 14,
    ordinary_15: 15,
    ordinary_16: 16,
    ordinary_17: 17,
    ordinary_18: 18,
    ordinary_19: 19,
    ordinary_20: 20,
    ordinary_21: 21,
    ordinary_22: 22,
    ordinary_23: 23,
    ordinary_24: 24,
    ordinary_25: 25,
    ordinary_26: 26,
    ordinary_27: 27,
    ordinary_28: 28,
    ordinary_29: 29,
    ordinary_30: 30,
    ordinary_31: 31,
    ordinary_32: 32,
    ordinary_33: 33,
  };

  if (ordinaryTimeMap[datePattern] !== undefined) {
    const weekNum = ordinaryTimeMap[datePattern];

    // Calculate the start of Ordinary Time after Baptism of the Lord
    const baptismOfLord = calculateCatholicLiturgicalDate('baptism_lord', liturgicalYear, cycle);

    // First part of Ordinary Time (before Lent)
    // Week 1 starts the day after Baptism of the Lord
    const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);

    // Calculate how many weeks until Ash Wednesday
    const weeksBeforeLent = Math.floor((ashWednesday.getTime() - baptismOfLord.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weekNum <= weeksBeforeLent) {
      // In the first part of Ordinary Time (before Lent)
      const daysAfterBaptism = (weekNum - 1) * 7;
      const nextSunday = new Date(baptismOfLord.getTime() + daysAfterBaptism * 24 * 60 * 60 * 1000);
      // Find the Sunday
      const daysUntilSunday = (7 - nextSunday.getDay()) % 7;
      return new Date(nextSunday.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
    } else {
      // In the second part of Ordinary Time (after Pentecost)
      // Calculate from Christ the King backwards
      const christKing = calculateCatholicLiturgicalDate('christ_king', liturgicalYear, cycle);
      const weeksFromEnd = 34 - weekNum;
      return new Date(christKing.getTime() - weeksFromEnd * 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Christ the King is the last Sunday before Advent
  if (datePattern === 'christ_king') {
    const advent1 = LiturgicalCalendar.calculateAdvent1(easterYear);
    return new Date(advent1.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Default to a Sunday in the middle of the year if pattern not recognized
  console.warn(`Unknown date pattern: ${datePattern}`);
  return new Date(easterYear, 5, 15); // June 15 as fallback
}

/**
 * Parse reading text to handle alternatives (OR syntax)
 */
function parseReadingText(text: string): { primary: string; alternative?: string } {
  const parts = text.split(' OR ');
  return {
    primary: parts[0].trim(),
    alternative: parts[1]?.trim(),
  };
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
    synchronize: false,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: process.env.NODE_ENV === 'production'
      ? [path.join(__dirname, '../models/*.entity.js')]
      : [path.join(__dirname, '../models/*.entity.ts')],
  });
  await AppDataSource.initialize();
  console.log('Database connection initialized');
}

/**
 * Create or find Catholic tradition
 */
async function createCatholicTradition(): Promise<Tradition> {
  const traditionRepo = AppDataSource.getRepository(Tradition);

  // Look for existing Catholic tradition by abbreviation
  let tradition = await traditionRepo.findOne({ where: { abbreviation: 'RC' } });

  if (!tradition) {
    // Try by name
    tradition = await traditionRepo.findOne({ where: { name: 'Roman Catholic' } });
  }

  if (!tradition) {
    tradition = traditionRepo.create({
      name: 'Roman Catholic',
      abbreviation: 'RC',
      description: 'The Roman Catholic Lectionary based on the Order of Readings for Mass',
    });
    await traditionRepo.save(tradition);
    console.log('Created Roman Catholic tradition');
  } else {
    console.log('Found existing Roman Catholic tradition');
  }

  return tradition;
}

/**
 * Clear existing Catholic data
 */
async function clearExistingData(tradition: Tradition): Promise<void> {
  const readingRepo = AppDataSource.getRepository(Reading);
  const seasonRepo = AppDataSource.getRepository(Season);
  const yearRepo = AppDataSource.getRepository(LiturgicalYear);

  // Delete existing readings for this tradition
  const readingResult = await readingRepo.delete({ traditionId: tradition.id });
  console.log(`Cleared ${readingResult.affected || 0} existing readings`);

  // Delete existing seasons
  const seasonResult = await seasonRepo
    .createQueryBuilder()
    .delete()
    .where('liturgicalYearId IN (SELECT id FROM liturgical_years WHERE tradition_id = :traditionId)', { traditionId: tradition.id })
    .execute();
  console.log(`Cleared ${seasonResult.affected || 0} existing seasons`);

  // Delete existing liturgical years
  const yearResult = await yearRepo.delete({ traditionId: tradition.id });
  console.log(`Cleared ${yearResult.affected || 0} existing liturgical years`);
}

/**
 * Import readings for a specific liturgical year
 */
async function importLiturgicalYear(
  yearData: CatholicYearData,
  liturgicalYear: number,
  tradition: Tradition,
): Promise<number> {
  const readingRepo = AppDataSource.getRepository(Reading);
  const yearRepo = AppDataSource.getRepository(LiturgicalYear);
  const seasonRepo = AppDataSource.getRepository(Season);

  let readingCount = 0;
  const cycle = yearData.year as LiturgicalCycle;

  // Create or find liturgical year
  let litYear = await yearRepo.findOne({
    where: {
      name: `Year ${cycle}`,
      traditionId: tradition.id,
      year: liturgicalYear,
    },
  });

  if (!litYear) {
    // Calculate liturgical year dates (Advent to Advent)
    const advent1 = LiturgicalCalendar.calculateAdvent1(liturgicalYear);
    const nextAdvent = LiturgicalCalendar.calculateAdvent1(liturgicalYear + 1);
    const endDate = new Date(nextAdvent.getTime() - 24 * 60 * 60 * 1000); // Day before next Advent

    litYear = yearRepo.create({
      name: `Year ${cycle}`,
      cycle: cycle,
      year: liturgicalYear,
      startDate: advent1,
      endDate: endDate,
      traditionId: tradition.id,
    });
    await yearRepo.save(litYear);
    console.log(`Created liturgical year ${liturgicalYear} (${cycle})`);
  }

  // Process each season
  for (const [seasonKey, seasonData] of Object.entries(yearData.seasons)) {
    console.log(`  Processing ${seasonData.name}...`);

    // Get season dates from liturgical calendar
    const calendarInfo = LiturgicalCalendar.generateLiturgicalYear(liturgicalYear);
    const seasonInfo = calendarInfo.seasons.find(s =>
      s.name.toLowerCase().includes(seasonKey.toLowerCase()) ||
      seasonKey.toLowerCase().includes(s.name.toLowerCase().replace(' time', '')),
    );

    // Create or find season
    let season = await seasonRepo.findOne({
      where: {
        name: seasonData.name,
        liturgicalYearId: litYear.id,
      },
    });

    if (!season && seasonInfo) {
      season = seasonRepo.create({
        name: seasonData.name,
        startDate: seasonInfo.startDate,
        endDate: seasonInfo.endDate,
        color: seasonInfo.color as LiturgicalColor,
        liturgicalYearId: litYear.id,
      });
      await seasonRepo.save(season);
    }

    // Process sundays
    if (seasonData.sundays) {
      for (const sunday of seasonData.sundays) {
        const date = calculateCatholicLiturgicalDate(sunday.date_pattern, liturgicalYear, cycle);

        // Process each reading type
        const readings = [
          { type: ReadingType.FIRST, text: sunday.readings.first },
          { type: ReadingType.PSALM, text: sunday.readings.psalm },
          { type: ReadingType.SECOND, text: sunday.readings.second },
          { type: ReadingType.GOSPEL, text: sunday.readings.gospel },
        ];

        for (const reading of readings) {
          const parsed = parseReadingText(reading.text);

          // Create primary reading
          const primaryReading = readingRepo.create({
            date: date,
            readingType: reading.type,
            scriptureReference: parsed.primary,
            translation: 'NAB', // New American Bible for Catholic
            readingOrder: 1,
            isAlternative: false,
            traditionId: tradition.id,
            liturgicalYearId: litYear.id,
            seasonId: season?.id,
          });
          await readingRepo.save(primaryReading);
          readingCount++;

          // Create alternative reading if exists
          if (parsed.alternative) {
            const altReading = readingRepo.create({
              date: date,
              readingType: reading.type,
              scriptureReference: parsed.alternative,
              translation: 'NAB',
              readingOrder: 2,
              isAlternative: true,
              traditionId: tradition.id,
              liturgicalYearId: litYear.id,
              seasonId: season?.id,
            });
            await readingRepo.save(altReading);
            readingCount++;
          }
        }

        console.log(`    ${sunday.name}: ${date.toDateString()}`);
      }
    }

    // Process feast days
    if (seasonData.feast_days) {
      for (const feast of seasonData.feast_days) {
        const date = calculateCatholicLiturgicalDate(feast.date_pattern, liturgicalYear, cycle);

        // Process each reading type
        const readings = [
          { type: ReadingType.FIRST, text: feast.readings.first },
          { type: ReadingType.PSALM, text: feast.readings.psalm },
          { type: ReadingType.SECOND, text: feast.readings.second },
          { type: ReadingType.GOSPEL, text: feast.readings.gospel },
        ];

        for (const reading of readings) {
          const parsed = parseReadingText(reading.text);

          // Create primary reading
          const primaryReading = readingRepo.create({
            date: date,
            readingType: reading.type,
            scriptureReference: parsed.primary,
            translation: 'NAB',
            readingOrder: 1,
            isAlternative: false,
            traditionId: tradition.id,
            liturgicalYearId: litYear.id,
            seasonId: season?.id,
          });
          await readingRepo.save(primaryReading);
          readingCount++;

          // Create alternative reading if exists
          if (parsed.alternative) {
            const altReading = readingRepo.create({
              date: date,
              readingType: reading.type,
              scriptureReference: parsed.alternative,
              translation: 'NAB',
              readingOrder: 2,
              isAlternative: true,
              traditionId: tradition.id,
              liturgicalYearId: litYear.id,
              seasonId: season?.id,
            });
            await readingRepo.save(altReading);
            readingCount++;
          }
        }

        console.log(`    ${feast.name}: ${date.toDateString()}`);
      }
    }
  }

  return readingCount;
}

/**
 * Main import function
 */
async function importCatholicData(): Promise<void> {
  try {
    console.log('Starting Roman Catholic Lectionary data import...');

    // Initialize database
    await initializeDatabase();

    // Create Catholic tradition
    const tradition = await createCatholicTradition();

    // Clear existing data
    await clearExistingData(tradition);

    // Load Catholic data files
    const dataDir = path.join(__dirname, '../../src/data');

    // Check which files exist
    const yearAPath = path.join(dataDir, 'catholic-year-a.json');
    const yearBPath = path.join(dataDir, 'catholic-year-b.json');
    const yearCPath = path.join(dataDir, 'catholic-year-c.json');

    const availableYears: { data: CatholicYearData; cycle: string }[] = [];

    if (fs.existsSync(yearAPath)) {
      availableYears.push({ data: JSON.parse(fs.readFileSync(yearAPath, 'utf-8')), cycle: 'A' });
      console.log('Loaded Catholic Year A data');
    }
    if (fs.existsSync(yearBPath)) {
      availableYears.push({ data: JSON.parse(fs.readFileSync(yearBPath, 'utf-8')), cycle: 'B' });
      console.log('Loaded Catholic Year B data');
    }
    if (fs.existsSync(yearCPath)) {
      availableYears.push({ data: JSON.parse(fs.readFileSync(yearCPath, 'utf-8')), cycle: 'C' });
      console.log('Loaded Catholic Year C data');
    }

    if (availableYears.length === 0) {
      console.error('No Catholic lectionary data files found!');
      process.exit(1);
    }

    let totalReadings = 0;

    // Import data for 2024-2027
    // Catholic follows same 3-year cycle as RCL:
    // Year C: 2024-2025 (starts Advent 2024)
    // Year A: 2025-2026 (starts Advent 2025)
    // Year B: 2026-2027 (starts Advent 2026)

    const yearMapping: { [key: number]: string } = {
      2024: 'C',
      2025: 'A',
      2026: 'B',
    };

    for (const [liturgicalYear, expectedCycle] of Object.entries(yearMapping)) {
      const yearNum = parseInt(liturgicalYear);
      const yearData = availableYears.find(y => y.cycle === expectedCycle);

      if (yearData) {
        console.log(`\nImporting Year ${expectedCycle} (${yearNum}-${yearNum + 1})...`);
        totalReadings += await importLiturgicalYear(yearData.data, yearNum, tradition);
      } else {
        console.log(`\nSkipping Year ${expectedCycle} (${yearNum}-${yearNum + 1}) - data file not available`);
      }
    }

    console.log(`\n✅ Total readings imported across all years: ${totalReadings}`);

    // Verify import
    const readingRepo = AppDataSource.getRepository(Reading);
    const count = await readingRepo.count({ where: { traditionId: tradition.id } });
    const uniqueDates = await readingRepo
      .createQueryBuilder('reading')
      .select('COUNT(DISTINCT reading.date)', 'count')
      .where('reading.traditionId = :traditionId', { traditionId: tradition.id })
      .getRawOne();

    console.log('\n✅ Catholic Lectionary data import completed!');
    console.log('📊 Import Summary:');
    console.log(`   Total Readings: ${count}`);
    console.log(`   Unique Dates: ${uniqueDates.count}`);
    console.log(`   Years Covered: 2024-2027`);

    // Test a specific date
    const testDate = new Date('2025-12-25'); // Christmas Day
    const testReadings = await readingRepo.find({
      where: {
        date: testDate,
        traditionId: tradition.id,
      },
      order: {
        readingType: 'ASC',
        readingOrder: 'ASC',
      },
    });

    if (testReadings.length > 0) {
      console.log(`\n📖 Sample readings for ${testDate.toDateString()}:`);
      testReadings.forEach(r => {
        console.log(`   ${r.readingType}: ${r.scriptureReference}${r.isAlternative ? ' (Alt)' : ''}`);
      });
    }

  } catch (error) {
    console.error('Error importing Catholic data:', error);
    process.exit(1);
  } finally {
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the import
importCatholicData();
