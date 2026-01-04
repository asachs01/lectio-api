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
import { Scripture } from '../models/scripture.entity';
import { SpecialDay } from '../models/special-day.entity';
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

interface RCLYearData {
  year: string;
  description: string;
  seasons: Record<string, SeasonData>;
}

/**
 * Map date patterns to actual liturgical dates
 */
function calculateLiturgicalDate(datePattern: string, liturgicalYear: number, cycle: string): Date {
  
  // Fixed dates
  if (datePattern === 'december_24') {
    return new Date(liturgicalYear, 11, 24);
  }
  if (datePattern === 'december_25') {
    return new Date(liturgicalYear, 11, 25);
  }
  if (datePattern === 'january_6') {
    return new Date(liturgicalYear + 1, 0, 6);
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
    // First Sunday after Christmas
    const christmas = new Date(liturgicalYear, 11, 25);
    const daysUntilSunday = (7 - christmas.getDay()) % 7 || 7;
    return new Date(christmas.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  }
  
  // Calculate Easter for the liturgical year (which starts in Advent of previous calendar year)
  const easterYear = liturgicalYear + 1; // Easter is in the calendar year after liturgical year starts
  const easter = LiturgicalCalendar.calculateEaster(easterYear);
  
  // Epiphany Season
  if (datePattern === 'baptism_lord') {
    // First Sunday after January 6
    const epiphany = new Date(easterYear, 0, 6);
    const daysUntilSunday = (7 - epiphany.getDay()) % 7 || 7;
    return new Date(epiphany.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  }
  
  if (datePattern === 'epiphany_2') {
    const baptism = calculateLiturgicalDate('baptism_lord', liturgicalYear, cycle);
    return new Date(baptism.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  
  if (datePattern === 'epiphany_3') {
    const baptism = calculateLiturgicalDate('baptism_lord', liturgicalYear, cycle);
    return new Date(baptism.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  
  if (datePattern === 'transfiguration') {
    // Last Sunday before Lent (Sunday before Ash Wednesday)
    const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
    return new Date(ashWednesday.getTime() - 3 * 24 * 60 * 60 * 1000); // Sunday before
  }
  
  // Lent
  if (datePattern === 'ash_wednesday') {
    return new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
  }
  
  if (datePattern === 'lent_1') {
    // First Sunday in Lent (Sunday after Ash Wednesday)
    const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
    return new Date(ashWednesday.getTime() + 4 * 24 * 60 * 60 * 1000); // Sunday after
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
  if (datePattern === 'palm_sunday') {
    return new Date(easter.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  // Easter Season
  if (datePattern === 'easter_vigil') {
    return new Date(easter.getTime() - 1 * 24 * 60 * 60 * 1000);
  }
  if (datePattern === 'easter_day') {
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
  if (datePattern === 'pentecost') {
    return new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
  }
  
  // Ordinary Time
  if (datePattern === 'trinity_sunday') {
    return new Date(easter.getTime() + 56 * 24 * 60 * 60 * 1000);
  }
  
  // Proper Sundays using correct RCL system (Sunday closest to specific dates)
  const properDates: { [key: string]: [number, number] } = {
    proper_4: [5, 1],    // June 1
    proper_5: [5, 8],    // June 8  
    proper_6: [5, 15],   // June 15
    proper_7: [5, 22],   // June 22
    proper_8: [5, 29],   // June 29
    proper_9: [6, 6],    // July 6
    proper_10: [6, 13],  // July 13
    proper_11: [6, 20],  // July 20
    proper_12: [6, 27],  // July 27
    proper_13: [7, 3],   // August 3
    proper_14: [7, 10],  // August 10
    proper_15: [7, 17],  // August 17
    proper_16: [7, 24],  // August 24
    proper_17: [7, 31],  // August 31
    proper_18: [8, 7],   // September 7
    proper_19: [8, 14],  // September 14
    proper_20: [8, 21],  // September 21
    proper_21: [8, 28],  // September 28
    proper_22: [9, 5],   // October 5
    proper_23: [9, 12],  // October 12
    proper_24: [9, 19],  // October 19
    proper_25: [9, 26],  // October 26
    proper_26: [10, 2],  // November 2
    proper_27: [10, 9],  // November 9
    proper_28: [10, 16], // November 16
  };
  
  if (properDates[datePattern] !== undefined) {
    const [month, day] = properDates[datePattern];
    const baseDate = new Date(easterYear, month, day);
    
    // Find the Sunday closest to this date
    const dayOfWeek = baseDate.getDay(); // 0 = Sunday
    let daysToSunday = 0;
    
    if (dayOfWeek <= 3) {
      // If it's Wed or earlier, go to previous Sunday
      daysToSunday = -dayOfWeek;
    } else {
      // If it's Thu or later, go to next Sunday
      daysToSunday = 7 - dayOfWeek;
    }
    
    return new Date(baseDate.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
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
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lectionary_api',
    synchronize: false,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Tradition, LiturgicalYear, Season, SpecialDay, Reading, Scripture],
  });
  await AppDataSource.initialize();
  console.log('Database connection initialized');
}

/**
 * Create or find RCL tradition
 */
async function createRCLTradition(): Promise<Tradition> {
  const traditionRepo = AppDataSource.getRepository(Tradition);
  
  let tradition = await traditionRepo.findOne({ where: { abbreviation: 'RCL' } });
  
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
 * Clear existing data
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
  yearData: RCLYearData,
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
        const date = calculateLiturgicalDate(sunday.date_pattern, liturgicalYear, cycle);
        
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
            translation: 'NRSV',
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
              translation: 'NRSV',
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
        const date = calculateLiturgicalDate(feast.date_pattern, liturgicalYear, cycle);
        
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
            translation: 'NRSV',
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
              translation: 'NRSV',
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
async function importRCLData(): Promise<void> {
  try {
    console.log('Starting RCL data import with proper liturgical dates...');
    
    // Initialize database
    await initializeDatabase();
    
    // Create RCL tradition
    const tradition = await createRCLTradition();
    
    // Clear existing data
    await clearExistingData(tradition);
    
    // Load RCL data files
    const dataDir = path.join(__dirname, '../../src/data');
    const yearAData: RCLYearData = JSON.parse(fs.readFileSync(path.join(dataDir, 'rcl-year-a.json'), 'utf-8'));
    const yearBData: RCLYearData = JSON.parse(fs.readFileSync(path.join(dataDir, 'rcl-year-b.json'), 'utf-8'));
    const yearCData: RCLYearData = JSON.parse(fs.readFileSync(path.join(dataDir, 'rcl-year-c.json'), 'utf-8'));
    
    console.log('Loaded RCL data files');
    
    // Import 3 years of data (2024-2027)
    // RCL follows a 3-year cycle: A, B, C
    // Year C: 2024-2025 (starts Advent 2024)
    // Year A: 2025-2026 (starts Advent 2025)
    // Year B: 2026-2027 (starts Advent 2026)
    
    let totalReadings = 0;
    
    // Import Year C (current - 2024-2025)
    console.log('\nImporting Year C (2024-2025)...');
    totalReadings += await importLiturgicalYear(yearCData, 2024, tradition);
    
    // Import Year A (2025-2026)
    console.log('\nImporting Year A (2025-2026)...');
    totalReadings += await importLiturgicalYear(yearAData, 2025, tradition);
    
    // Import Year B (2026-2027)
    console.log('\nImporting Year B (2026-2027)...');
    totalReadings += await importLiturgicalYear(yearBData, 2026, tradition);
    
    console.log(`\n✅ Total readings imported across all years: ${totalReadings}`);
    
    // Verify import
    const readingRepo = AppDataSource.getRepository(Reading);
    const count = await readingRepo.count({ where: { traditionId: tradition.id } });
    const uniqueDates = await readingRepo
      .createQueryBuilder('reading')
      .select('COUNT(DISTINCT reading.date)', 'count')
      .where('reading.traditionId = :traditionId', { traditionId: tradition.id })
      .getRawOne();
    
    console.log('\n✅ RCL data import completed successfully!');
    console.log('📊 Import Summary:');
    console.log(`   Total Readings: ${count}`);
    console.log(`   Unique Dates: ${uniqueDates.count}`);
    console.log('   Years Covered: 2024-2027');
    
    // Test a specific date
    const testDate = new Date('2025-09-07'); // Proper 15, Year C (in liturgical year 2024-2025)
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
    console.error('Error importing RCL data:', error);
    process.exit(1);
  } finally {
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the import
importRCLData();