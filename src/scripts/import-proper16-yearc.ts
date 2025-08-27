#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Reading } from '../models/reading.entity';
import { ReadingType } from '../models/reading.entity';

// Load environment variables
config();

async function importProper16YearC(): Promise<void> {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lectionary_api',
    synchronize: false,
    logging: false,
    entities: [
      path.join(__dirname, '../models/*.entity.ts'),
    ],
  });

  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    
    // Get Year C and tradition
    const yearCResult = await AppDataSource.query(`
      SELECT id FROM liturgical_years WHERE cycle = 'C' LIMIT 1
    `);
    const yearCId = yearCResult[0].id;
    console.log('Found Year C:', yearCId);
    
    const traditionResult = await AppDataSource.query(`
      SELECT id FROM traditions WHERE abbreviation = 'RCL' LIMIT 1
    `);
    const traditionId = traditionResult[0].id;
    console.log('Found RCL tradition:', traditionId);
    
    const seasonResult = await AppDataSource.query(`
      SELECT id FROM seasons WHERE name = 'Ordinary Time' AND liturgical_year_id = $1 LIMIT 1
    `, [yearCId]);
    const seasonId = seasonResult[0].id;
    console.log('Found Ordinary Time season:', seasonId);
    
    // Proper 16 date (using the mock date from import script)
    const proper16Date = new Date(2025, 8, 7); // Sep 7, 2025
    
    // Year C Proper 16 readings - directly from the user's requirements
    const readings = [
      {
        type: ReadingType.FIRST,
        primary: 'Jeremiah 1:4-10',
        alternative: 'Isaiah 58:9b-14',
      },
      {
        type: ReadingType.PSALM,
        primary: 'Psalm 71:1-6',
        alternative: 'Psalm 103:1-8',
      },
      {
        type: ReadingType.SECOND,
        primary: 'Hebrews 12:18-29',
        alternative: null,
      },
      {
        type: ReadingType.GOSPEL,
        primary: 'Luke 13:10-17',
        alternative: null,
      },
    ];
    
    const readingRepo = AppDataSource.getRepository(Reading);
    
    for (const reading of readings) {
      console.log(`\nProcessing ${reading.type}:`);
      console.log(`  Primary: ${reading.primary}`);
      if (reading.alternative) {
        console.log(`  Alternative: ${reading.alternative}`);
      }
      
      // Create primary reading
      const primaryReading = readingRepo.create({
        date: proper16Date,
        readingType: reading.type,
        scriptureReference: reading.primary,
        text: null,
        translation: 'NRSV',
        readingOrder: Object.values(ReadingType).indexOf(reading.type) + 1,
        notes: 'Proper 16 (Ordinary 21) - ' + reading.type,
        isAlternative: false,
        traditionId: traditionId,
        liturgicalYearId: yearCId,
        seasonId: seasonId,
        specialDayId: null,
        scriptureId: null,
      });
      
      await readingRepo.save(primaryReading);
      console.log(`  ✓ Created primary reading: ${reading.primary}`);
      
      // Create alternative reading if exists
      if (reading.alternative) {
        const altReading = readingRepo.create({
          date: proper16Date,
          readingType: reading.type,
          scriptureReference: reading.alternative,
          text: null,
          translation: 'NRSV',
          readingOrder: Object.values(ReadingType).indexOf(reading.type) + 1,
          notes: 'Proper 16 (Ordinary 21) - ' + reading.type + ' (Alternative)',
          isAlternative: true,
          traditionId: traditionId,
          liturgicalYearId: yearCId,
          seasonId: seasonId,
          specialDayId: null,
          scriptureId: null,
        });
        
        await readingRepo.save(altReading);
        console.log(`  ✓ Created alternative reading: ${reading.alternative}`);
      }
    }
    
    console.log('\n✅ Successfully imported Year C Proper 16 readings!');
    
    // Verify the import
    console.log('\nVerifying import...');
    const verifyResult = await AppDataSource.query(`
      SELECT 
        reading_type,
        scripture_reference,
        is_alternative
      FROM readings r
      WHERE notes LIKE '%Proper 16%'
        AND liturgical_year_id = $1
      ORDER BY reading_order, is_alternative
    `, [yearCId]);
    
    console.log('Year C Proper 16 readings in database:');
    verifyResult.forEach((r: any) => {
      console.log(`  ${r.reading_type}: ${r.scripture_reference} ${r.is_alternative ? '(Alt)' : ''}`);
    });
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  importProper16YearC();
}