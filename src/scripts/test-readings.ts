#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

async function testReadings(): Promise<void> {
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
    
    // Test query for August 25, 2025 (should be around Proper 16)
    const date = '2024-09-05'; // This is approximately where Proper 16 was placed
    
    const result = await AppDataSource.query(`
      SELECT 
        r.date,
        r.reading_type,
        r.scripture_reference,
        r.is_alternative,
        r.notes,
        t.name as tradition,
        ly.cycle
      FROM readings r
      JOIN traditions t ON r.tradition_id = t.id
      LEFT JOIN liturgical_years ly ON r.liturgical_year_id = ly.id
      WHERE r.date = $1
      ORDER BY r.reading_order, r.is_alternative
    `, [date]);
    
    console.log(`\nReadings for ${date}:`);
    result.forEach((reading: any) => {
      console.log(`  ${reading.reading_type}: ${reading.scripture_reference} ${reading.is_alternative ? '(Alternative)' : ''}`);
      console.log(`    Notes: ${reading.notes}`);
      console.log(`    Tradition: ${reading.tradition}, Cycle: ${reading.cycle}`);
    });
    
    // Now check what dates we have for Proper 16
    const proper16Result = await AppDataSource.query(`
      SELECT DISTINCT 
        r.date,
        r.notes,
        ly.cycle
      FROM readings r
      LEFT JOIN liturgical_years ly ON r.liturgical_year_id = ly.id
      WHERE r.notes LIKE '%Proper 16%'
      ORDER BY ly.cycle, r.date
    `);
    
    console.log('\nProper 16 entries in database:');
    proper16Result.forEach((entry: any) => {
      console.log(`  Year ${entry.cycle}: ${entry.date} - ${entry.notes}`);
    });
    
    // Check Year C Proper 16 specifically
    const yearCProper16 = await AppDataSource.query(`
      SELECT 
        r.reading_type,
        r.scripture_reference,
        r.is_alternative
      FROM readings r
      JOIN liturgical_years ly ON r.liturgical_year_id = ly.id
      WHERE ly.cycle = 'C'
        AND r.notes LIKE '%Proper 16%'
      ORDER BY r.reading_order, r.is_alternative
    `);
    
    console.log('\nYear C - Proper 16 readings:');
    yearCProper16.forEach((reading: any) => {
      console.log(`  ${reading.reading_type}: ${reading.scripture_reference} ${reading.is_alternative ? '(Alt)' : ''}`);
    });
    
    console.log('\n✅ Expected Year C Proper 16 readings (August 25, 2025):');
    console.log('  First: Jeremiah 1:4-10 OR Isaiah 58:9b-14');
    console.log('  Psalm: Psalm 71:1-6 OR Psalm 103:1-8');
    console.log('  Second: Hebrews 12:18-29');
    console.log('  Gospel: Luke 13:10-17');
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testReadings();
}