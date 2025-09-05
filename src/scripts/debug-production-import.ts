#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: false,
  logging: false,
  entities: [path.join(__dirname, '../models/*.entity.js'), path.join(__dirname, '../models/*.entity.ts')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function debugProductionImport(): Promise<void> {
  try {
    console.log('🔍 Debugging production import state...\n');
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // 1. Check if traditions exist
    console.log('\n=== CHECKING TRADITIONS ===');
    const traditions = await AppDataSource.query('SELECT id, name, abbreviation FROM traditions ORDER BY abbreviation');
    console.log(`Found ${traditions.length} traditions:`);
    traditions.forEach((t: { abbreviation: string; name: string; id: string }) => console.log(`  - ${t.abbreviation}: ${t.name} (ID: ${t.id})`));
    
    const rclTradition = traditions.find((t: { abbreviation: string; name: string; id: string }) => t.abbreviation === 'RCL');
    if (!rclTradition) {
      throw new Error('❌ RCL tradition not found!');
    }
    console.log(`✅ RCL tradition found: ${rclTradition.id}`);

    // 2. Check if liturgical years exist for RCL
    console.log('\n=== CHECKING LITURGICAL YEARS ===');
    const liturgicalYears = await AppDataSource.query(`
      SELECT id, name, year, cycle, start_date, end_date 
      FROM liturgical_years 
      WHERE tradition_id = $1 
      ORDER BY year
    `, [rclTradition.id]);
    
    console.log(`Found ${liturgicalYears.length} liturgical years for RCL:`);
    liturgicalYears.forEach((ly: { year: number; cycle: string; start_date: string; end_date: string; id: string }) => {
      console.log(`  - Year ${ly.year} (${ly.cycle}): ${ly.start_date} to ${ly.end_date} (ID: ${ly.id})`);
    });
    
    const year2024 = liturgicalYears.find((ly: { year: number; cycle: string; start_date: string; end_date: string; id: string }) => ly.year === 2024);
    if (!year2024) {
      throw new Error('❌ Liturgical year 2024 not found!');
    }
    console.log(`✅ Liturgical year 2024 found: ${year2024.id}`);

    // 3. Check if readings already exist for 2025 dates
    console.log('\n=== CHECKING EXISTING READINGS ===');
    const existingReadings2025 = await AppDataSource.query(`
      SELECT COUNT(*) as count
      FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTradition.id]);
    
    console.log(`Existing readings for June-Nov 2025: ${existingReadings2025[0].count}`);

    // 4. Check total readings for RCL
    const totalReadings = await AppDataSource.query(`
      SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date
      FROM readings 
      WHERE tradition_id = $1
    `, [rclTradition.id]);
    
    console.log(`Total RCL readings: ${totalReadings[0].count}`);
    console.log(`Date range: ${totalReadings[0].min_date} to ${totalReadings[0].max_date}`);

    // 5. Check if RCL data files exist in production
    console.log('\n=== CHECKING DATA FILES ===');
    const dataDir = path.join(__dirname, '../data');
    console.log(`Looking for data files in: ${dataDir}`);
    
    const files = ['rcl-year-a.json', 'rcl-year-b.json', 'rcl-year-c.json'];
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const exists = fs.existsSync(filePath);
      console.log(`  ${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`    Size: ${Math.round(stats.size / 1024)}KB, Modified: ${stats.mtime.toISOString()}`);
      }
    }

    // 6. Sample a few specific dates to see what's in the database
    console.log('\n=== CHECKING SPECIFIC DATES ===');
    const testDates = ['2024-12-01', '2025-06-08', '2025-09-07'];
    for (const testDate of testDates) {
      const readings = await AppDataSource.query(`
        SELECT reading_type, scripture_reference 
        FROM readings 
        WHERE tradition_id = $1 AND date = $2
        ORDER BY reading_order
      `, [rclTradition.id, testDate]);
      
      console.log(`  ${testDate}: ${readings.length} readings`);
      if (readings.length > 0) {
        readings.forEach((r: { reading_type: string; scripture_reference: string }) => console.log(`    - ${r.reading_type}: ${r.scripture_reference}`));
      }
    }

    await AppDataSource.destroy();
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

debugProductionImport();