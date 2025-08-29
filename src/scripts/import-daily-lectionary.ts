#!/usr/bin/env ts-node

/**
 * Import Daily Lectionary Data into Database
 */

import { DataSource, In } from 'typeorm';
import { Reading, ReadingType, ReadingOffice } from '../models/reading.entity';
import { Tradition } from '../models/tradition.entity';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Create data source
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [
    path.join(__dirname, '..', 'models', '*.entity{.ts,.js}'),
  ],
});

interface DailyReadingData {
  date: string;
  year: string;
  office: string;
  readings: {
    oldTestament?: string;
    psalm: string;
    newTestament?: string;
    gospel?: string;
  };
  notes?: string;
}

async function importDailyLectionary() {
  console.log('Starting Daily Lectionary import...');
  
  // Initialize database connection
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
  }

  try {
    // Load daily lectionary data
    const dataPath = path.join(__dirname, '..', 'data', 'daily-lectionary.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const lectData = JSON.parse(rawData);
    const dailyReadings: DailyReadingData[] = lectData.readings;
    
    console.log(`Loaded ${dailyReadings.length} daily readings`);

    // Get or create Daily Office tradition
    const traditionRepo = AppDataSource.getRepository(Tradition);
    let dailyTradition = await traditionRepo.findOne({ where: { abbreviation: 'Daily' } });
    
    if (!dailyTradition) {
      dailyTradition = traditionRepo.create({
        name: 'Daily Office Lectionary',
        abbreviation: 'Daily',
        description: 'Two-year cycle of daily readings for Morning and Evening Prayer',
      });
      await traditionRepo.save(dailyTradition);
      console.log('Created Daily Office tradition');
    } else {
      console.log('Found existing Daily Office tradition');
    }

    // Clear existing daily readings for this tradition
    const readingRepo = AppDataSource.getRepository(Reading);
    await readingRepo.delete({ 
      traditionId: dailyTradition.id,
      readingOffice: In([ReadingOffice.MORNING, ReadingOffice.EVENING]),
    });
    console.log('Cleared existing daily readings');

    // Import each daily reading
    const readings: Reading[] = [];
    let processedCount = 0;

    for (const dailyData of dailyReadings) {
      const date = new Date(dailyData.date);
      const office = dailyData.office === 'morning' ? ReadingOffice.MORNING : ReadingOffice.EVENING;
      
      // Create reading entries for each scripture reference
      let order = 1;
      
      // Old Testament (morning only)
      if (dailyData.readings.oldTestament) {
        readings.push(readingRepo.create({
          date,
          traditionId: dailyTradition.id,
          readingType: ReadingType.OLD_TESTAMENT,
          readingOffice: office,
          scriptureReference: dailyData.readings.oldTestament,
          readingOrder: order++,
          cycleYear: dailyData.year,
          notes: dailyData.notes,
          translation: 'NRSV',
        }));
      }
      
      // Psalm
      if (dailyData.readings.psalm) {
        const psalmType = office === ReadingOffice.MORNING 
          ? ReadingType.MORNING_PSALM 
          : ReadingType.EVENING_PSALM;
        
        readings.push(readingRepo.create({
          date,
          traditionId: dailyTradition.id,
          readingType: psalmType,
          readingOffice: office,
          scriptureReference: dailyData.readings.psalm,
          readingOrder: order++,
          cycleYear: dailyData.year,
          notes: dailyData.notes,
          translation: 'NRSV',
        }));
      }
      
      // New Testament (morning only)
      if (dailyData.readings.newTestament) {
        readings.push(readingRepo.create({
          date,
          traditionId: dailyTradition.id,
          readingType: ReadingType.NEW_TESTAMENT,
          readingOffice: office,
          scriptureReference: dailyData.readings.newTestament,
          readingOrder: order++,
          cycleYear: dailyData.year,
          notes: dailyData.notes,
          translation: 'NRSV',
        }));
      }
      
      // Gospel (evening only)
      if (dailyData.readings.gospel) {
        readings.push(readingRepo.create({
          date,
          traditionId: dailyTradition.id,
          readingType: ReadingType.GOSPEL,
          readingOffice: office,
          scriptureReference: dailyData.readings.gospel,
          readingOrder: order++,
          cycleYear: dailyData.year,
          notes: dailyData.notes,
          translation: 'NRSV',
        }));
      }
      
      processedCount++;
      
      // Save in batches
      if (readings.length >= 100) {
        await readingRepo.save(readings);
        console.log(`Saved ${readings.length} readings (${processedCount}/${dailyReadings.length})`);
        readings.length = 0; // Clear array
      }
    }
    
    // Save remaining readings
    if (readings.length > 0) {
      await readingRepo.save(readings);
      console.log(`Saved final ${readings.length} readings`);
    }

    // Verify import
    const totalCount = await readingRepo.count({
      where: { 
        traditionId: dailyTradition.id,
        readingOffice: In([ReadingOffice.MORNING, ReadingOffice.EVENING]),
      },
    });
    
    console.log('\n✅ Daily Lectionary Import Complete!');
    console.log(`📚 Total Daily Readings: ${totalCount}`);
    
    // Show sample for verification
    const sampleReadings = await readingRepo.find({
      where: { 
        traditionId: dailyTradition.id,
        date: new Date('2025-08-29'),
      },
      order: { readingOffice: 'ASC', readingOrder: 'ASC' },
    });
    
    if (sampleReadings.length > 0) {
      console.log('\n📖 Sample readings for August 29, 2025:');
      sampleReadings.forEach((r: Reading) => {
        console.log(`   ${r.readingOffice}: ${r.scriptureReference}`);
      });
    }

  } catch (error) {
    console.error('Error importing daily lectionary:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  importDailyLectionary().catch(console.error);
}

export { importDailyLectionary };