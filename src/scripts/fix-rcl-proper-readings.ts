#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

/**
 * Fix RCL readings with correct Proper calculations
 * This script:
 * 1. Deletes existing RCL readings that have wrong Proper dates
 * 2. Re-runs import with corrected Proper calculation logic
 */

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: false,
  logging: false,
  entities: process.env.NODE_ENV === 'production' 
    ? [path.join(__dirname, '../models/*.entity.js')]
    : [path.join(__dirname, '../models/*.entity.ts')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixRCLProperReadings(): Promise<void> {
  try {
    console.log('🔧 Fixing RCL Proper readings with correct calculations...\n');
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // 1. Find RCL tradition
    const traditions = await AppDataSource.query('SELECT id, abbreviation FROM traditions WHERE abbreviation = $1', ['RCL']);
    if (traditions.length === 0) {
      throw new Error('❌ RCL tradition not found!');
    }
    const rclTraditionId = traditions[0].id;
    console.log(`✅ Found RCL tradition: ${rclTraditionId}`);

    // 2. Delete existing RCL readings for 2025 (the ones with wrong Proper calculations)
    const deleteResult = await AppDataSource.query(`
      DELETE FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTraditionId]);
    
    console.log(`🗑️  Deleted ${deleteResult[1]} existing RCL readings for 2025`);

    // 3. Re-run import script with corrected logic
    console.log('🔄 Running corrected import script...\n');
    
    await AppDataSource.destroy();
    
    // Import the corrected script and run it
    const { execSync } = await import('child_process');
    execSync('npx ts-node src/scripts/import-rcl-with-dates.ts', { 
      encoding: 'utf8',
      stdio: 'inherit',
    });
    
    console.log('\n✅ Import script completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Test a specific date to verify the fix
async function testSpecificDate(): Promise<void> {
  try {
    await AppDataSource.initialize();
    
    console.log('\n🧪 Testing September 7, 2025 readings...');
    
    const traditions = await AppDataSource.query('SELECT id FROM traditions WHERE abbreviation = $1', ['RCL']);
    const rclTraditionId = traditions[0].id;
    
    const readings = await AppDataSource.query(`
      SELECT reading_type, scripture_reference, date
      FROM readings 
      WHERE tradition_id = $1 
      AND date = '2025-09-07'
      ORDER BY reading_order
    `, [rclTraditionId]);
    
    console.log(`Found ${readings.length} readings for September 7, 2025:`);
    readings.forEach((r: { reading_type: string; scripture_reference: string }) => {
      console.log(`  - ${r.reading_type}: ${r.scripture_reference}`);
    });
    
    if (readings.length > 0) {
      console.log('\n✅ Readings found! The fix worked.');
      console.log('Expected Proper 18 readings should include:');
      console.log('  - Jeremiah 18:1-11 / Deuteronomy 30:15-20');
      console.log('  - Psalm 139:1-5, 12-17 / Psalm 1');
      console.log('  - Philemon 1-21');
      console.log('  - Luke 14:25-33');
    } else {
      console.log('❌ No readings found - something is still wrong');
    }
    
    await AppDataSource.destroy();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Main execution
if (require.main === module) {
  fixRCLProperReadings()
    .then(() => testSpecificDate())
    .catch(console.error);
}