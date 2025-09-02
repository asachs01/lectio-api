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
  
  // Proper Sundays (counted from Pentecost)
  // Proper 4 is the Sunday closest to June 1
  // We'll calculate based on weeks after Pentecost
  const pentecost = new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
  const properMap: { [key: string]: number } = {
    proper_4: 2,   // 2 weeks after Pentecost
    proper_5: 3,
    proper_6: 4,
    proper_7: 5,
    proper_8: 6,
    proper_9: 7,
    proper_10: 8,
    proper_11: 9,
    proper_12: 10,
    proper_13: 11,
    proper_14: 12,
    proper_15: 13,
    proper_16: 14,
    proper_17: 15,
    proper_18: 16,
    proper_19: 17,
    proper_20: 18,
    proper_21: 19,
    proper_22: 20,
    proper_23: 21,
    proper_24: 22,
    proper_25: 23,
    proper_26: 24,
    proper_27: 25,
    proper_28: 26,
    christ_king: 27, // Last Sunday before Advent
  };
  
  if (properMap[datePattern] !== undefined) {
    return new Date(pentecost.getTime() + properMap[datePattern] * 7 * 24 * 60 * 60 * 1000);
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
 * Ensure all liturgical seasons exist for a given year
 */
async function createAllLiturgicalSeasons(
  liturgicalYear: number, 
  litYear: LiturgicalYear, 
  seasonRepo: any
): Promise<void> {
  // Generate complete liturgical calendar with all seasons
  const calendarInfo = LiturgicalCalendar.generateLiturgicalYear(liturgicalYear);
  
  console.log(`  Ensuring all ${calendarInfo.seasons.length} liturgical seasons exist...`);
  
  for (const seasonInfo of calendarInfo.seasons) {
    // Check if season already exists
    let existingSeason = await seasonRepo.findOne({
      where: {
        name: seasonInfo.name,
        liturgicalYearId: litYear.id,
      },
    });
    
    // Create season if it doesn't exist
    if (!existingSeason) {
      const season = seasonRepo.create({
        name: seasonInfo.name,
        startDate: seasonInfo.startDate,
        endDate: seasonInfo.endDate,
        color: seasonInfo.color as LiturgicalColor,
        liturgicalYearId: litYear.id,
      });
      await seasonRepo.save(season);
      console.log(`    ✓ Created season: ${seasonInfo.name} (${seasonInfo.startDate.toISOString().split('T')[0]} - ${seasonInfo.endDate.toISOString().split('T')[0]})`);
    } else {
      console.log(`    - Season already exists: ${seasonInfo.name}`);
    }
  }
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
  
  // Ensure ALL liturgical seasons exist (not just ones with readings data)
  await createAllLiturgicalSeasons(liturgicalYear, litYear, seasonRepo);
  
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
    
    // Import 3 years of data (2024-2026)
    // Year A: 2025-2026 (starts Advent 2025)
    // Year B: 2024-2025 (starts Advent 2024)
    // Year C: 2026-2027 (starts Advent 2026)
    
    let totalReadings = 0;
    
    // Import Year B (current - 2024-2025)
    console.log('\nImporting Year B (2024-2025)...');
    totalReadings += await importLiturgicalYear(yearBData, 2024, tradition);
    
    // Import Year C (2025-2026)
    console.log('\nImporting Year C (2025-2026)...');
    totalReadings += await importLiturgicalYear(yearCData, 2025, tradition);
    
    // Import Year A (2026-2027)
    console.log('\nImporting Year A (2026-2027)...');
    totalReadings += await importLiturgicalYear(yearAData, 2026, tradition);
    
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
    const testDate = new Date('2025-08-25'); // Proper 16, Year C
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