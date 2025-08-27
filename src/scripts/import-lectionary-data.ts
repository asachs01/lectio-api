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

/**
 * Calculate a mock date for liturgical events (for demonstration purposes)
 */
function calculateMockDate(datePattern: string, year: number = 2024): Date {
  const baseDate = new Date(year, 0, 1); // Start of year
  
  // This is a simplified mock calculation - in reality you'd use proper liturgical calendar calculations
  const mockOffsets = {
    advent_1: -30, // Nov 30 area
    advent_2: -23,
    advent_3: -16,
    advent_4: -9,
    december_24: -7, // Dec 24
    december_25: -6, // Dec 25
    christmas_1: 0,   // Jan 1
    january_6: 5,     // Jan 6
    baptism_lord: 12,  // Mid January
    epiphany_2: 19,
    epiphany_3: 26,
    transfiguration: 45, // Mid February
    ash_wednesday: 52,   // Late February
    lent_1: 59,
    lent_2: 66,
    lent_3: 73,
    lent_4: 80,
    lent_5: 87,
    palm_sunday: 94,
    easter_vigil: 101,
    easter_day: 102,
    easter_2: 109,
    easter_3: 116,
    easter_4: 123,
    easter_5: 130,
    easter_6: 137,
    ascension: 141,
    easter_7: 144,
    pentecost: 151,
    trinity_sunday: 158,
    proper_4: 165,
    proper_5: 172,
    proper_6: 179,
    proper_7: 186,
    proper_8: 193,
    proper_9: 200,
    proper_10: 207,
    proper_11: 214,
    proper_12: 221,
    proper_13: 228,
    proper_14: 235,
    proper_15: 242,
    proper_16: 249, // Around August 25 for proper_16
    proper_17: 256,
    proper_18: 263,
    proper_19: 270,
    proper_20: 277,
    proper_21: 284,
    proper_22: 291,
    proper_23: 298,
    proper_24: 305,
    proper_25: 312,
    proper_26: 319,
    proper_27: 326,
    proper_28: 333,
    christ_king: 340,
  };
  
  const offset = mockOffsets[datePattern as keyof typeof mockOffsets] || 0;
  const resultDate = new Date(baseDate);
  resultDate.setDate(baseDate.getDate() + offset);
  return resultDate;
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
    // Create mock start and end dates
    const mockYear = liturgicalYear.year;
    const startDate = calculateMockDate(seasonKey + '_start', mockYear);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 60); // Rough 2-month seasons
    
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
    console.log(`Created season: ${seasonName} for Year ${liturgicalYear.cycle}`);
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
  
  const mockDate = calculateMockDate(sundayFeastData.date_pattern, liturgicalYear.year);
  
  let specialDay = await specialDayRepo.findOne({
    where: {
      name: sundayFeastData.name,
      date: mockDate,
      traditionId: tradition.id,
    },
  });
  
  if (!specialDay) {
    specialDay = specialDayRepo.create({
      name: sundayFeastData.name,
      date: mockDate,
      type: SpecialDayType.FEAST,
      rank: SpecialDayRank.FEAST,
      description: DATE_PATTERN_DESCRIPTIONS[sundayFeastData.date_pattern as keyof typeof DATE_PATTERN_DESCRIPTIONS] || sundayFeastData.name,
      traditionId: tradition.id,
      year: liturgicalYear.year,
      isFeastDay: true,
      isMoveable: sundayFeastData.date_pattern.includes('easter') || sundayFeastData.date_pattern.includes('lent'),
    });
    await specialDayRepo.save(specialDay);
    console.log(`Created special day: ${sundayFeastData.name}`);
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
  specialDay?: SpecialDay,
): Promise<void> {
  const readingRepo = AppDataSource.getRepository(Reading);
  
  // Mock date calculation
  const mockDate = calculateMockDate(sundayFeastData.date_pattern, liturgicalYear.year);
  
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
        date: mockDate,
        readingType: reading.type,
        traditionId: tradition.id,
        isAlternative: false,
      },
    });
    
    if (!existingReading) {
      const newReading = readingRepo.create({
        date: mockDate,
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
          date: mockDate,
          readingType: reading.type,
          traditionId: tradition.id,
          isAlternative: true,
        },
      });
      
      if (!existingAltReading) {
        const altReading = readingRepo.create({
          date: mockDate,
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
  
  console.log(`Created readings for: ${sundayFeastData.name} (${sundayFeastData.date_pattern})`);
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
      
      // Create liturgical year
      const liturgicalYear = await createLiturgicalYear(yearData.year, tradition);
      
      // Process each season
      const seasonKeys = Object.keys(yearData.seasons).sort((a, b) => {
        return getSeasonOrder(a) - getSeasonOrder(b);
      });
      
      for (const seasonKey of seasonKeys) {
        const seasonData = yearData.seasons[seasonKey];
        console.log(`\n  Processing season: ${seasonData.name}...`);
        
        // Create season
        const season = await createLiturgicalSeason(seasonKey, seasonData, liturgicalYear);
        
        // Process regular Sundays
        if (seasonData.sundays) {
          for (const sunday of seasonData.sundays) {
            const specialDay = await createSpecialDay(sunday, liturgicalYear, tradition);
            await createLectionaryReading(sunday, season, liturgicalYear, tradition, specialDay || undefined);
          }
        }
        
        // Process feast days
        if (seasonData.feast_days) {
          for (const feastDay of seasonData.feast_days) {
            const specialDay = await createSpecialDay(feastDay, liturgicalYear, tradition);
            await createLectionaryReading(feastDay, season, liturgicalYear, tradition, specialDay || undefined);
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