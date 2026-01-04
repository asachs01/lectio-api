#!/usr/bin/env node

require('reflect-metadata');
const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
config();

console.log('🚀 FORCING RCL PROPER FIX TO RUN...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

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

async function fixRclProperReadings() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected for RCL fix');

    // Get RCL tradition ID
    const rclTraditions = await AppDataSource.query(
      'SELECT id FROM traditions WHERE abbreviation = $1',
      ['RCL']
    );

    if (rclTraditions.length === 0) {
      console.log('❌ RCL tradition not found');
      return;
    }

    const rclTraditionId = rclTraditions[0].id;
    console.log('✅ Found RCL tradition:', rclTraditionId);

    // Delete existing RCL readings for 2025 (wrong Proper calculations)
    console.log('🗑️  Deleting wrong RCL readings for June-November 2025...');
    const deleteResult = await AppDataSource.query(`
      DELETE FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTraditionId]);

    console.log(`✅ Deleted ${deleteResult.affectedRows || 0} wrong readings`);

    // Check if September 7, 2025 readings now exist
    const sep7Check = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM readings 
       WHERE tradition_id = $1 AND date = '2025-09-07'`,
      [rclTraditionId]
    );

    if (parseInt(sep7Check[0].count) === 0) {
      console.log('✅ September 7, 2025 readings successfully removed');
      console.log('🔄 Now re-importing with correct Proper calculations...');
      
      // Force exit and let the fix script run
      console.log('✅ RCL Proper fix preparation completed');
    } else {
      console.log('⚠️  September 7, 2025 readings still exist after deletion');
    }

    await AppDataSource.destroy();
    
  } catch (error) {
    console.error('❌ RCL Proper fix failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixRclProperReadings();
}