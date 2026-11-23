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
import { addCivilDays, toLocalDate } from '../utils/civil-date';
import { cycleForAdventYear, resolveLectionaryDate } from '../utils/lectionary-dates';

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
 * Map date patterns to actual liturgical dates using timezone-safe civil math.
 * Returns null when the Sunday is omitted (out of season, or a principal feast
 * such as Trinity Sunday takes precedence).
 */
function calculateLiturgicalDate(datePattern: string, liturgicalYear: number, _cycle: string): Date | null {
  const civil = resolveLectionaryDate(datePattern, liturgicalYear);
  return civil ? toLocalDate(civil) : null;
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
    const endDate = toLocalDate(addCivilDays(
      { year: nextAdvent.getFullYear(), month: nextAdvent.getMonth() + 1, day: nextAdvent.getDate() },
      -1,
    ));
    
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
        if (!date) {
          console.log(`    ${sunday.name}: omitted (precedence or out of season)`);
          continue;
        }

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
        if (!date) {
          console.log(`    ${feast.name}: omitted (precedence or out of season)`);
          continue;
        }

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
    
    // Default coverage is Advent 2024 through Advent 2030. Override with
    // LECTIO_SEED_START_YEAR and LECTIO_SEED_END_YEAR (inclusive advent years).
    const startYear = parseInt(process.env.LECTIO_SEED_START_YEAR || '2024', 10);
    const endYear = parseInt(process.env.LECTIO_SEED_END_YEAR || '2030', 10);
    const dataByCycle: Record<string, RCLYearData> = { A: yearAData, B: yearBData, C: yearCData };

    let totalReadings = 0;
    for (let adventYear = startYear; adventYear <= endYear; adventYear++) {
      const cycle = cycleForAdventYear(adventYear);
      console.log(`\nImporting Year ${cycle} (Advent ${adventYear})...`);
      totalReadings += await importLiturgicalYear(dataByCycle[cycle], adventYear, tradition);
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
    
    console.log('\n✅ RCL data import completed successfully!');
    console.log('📊 Import Summary:');
    console.log(`   Total Readings: ${count}`);
    console.log(`   Unique Dates: ${uniqueDates.count}`);
    console.log(`   Years Covered: Advent ${startYear}–${endYear}`);
    
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