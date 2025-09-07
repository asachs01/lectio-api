#!/usr/bin/env node

require('reflect-metadata');
const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config();

console.log('🚀 DIRECT PRODUCTION RCL FIX - FINAL ATTEMPT');
console.log('📡 Connecting to production database...');

// Production database connection with all necessary environment variables
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, 'dist/models/*.entity.js')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function directProductionFix() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to production database');

    // Get RCL tradition ID
    const rclResult = await AppDataSource.query(
      'SELECT id FROM traditions WHERE abbreviation = $1',
      ['RCL']
    );

    if (rclResult.length === 0) {
      throw new Error('RCL tradition not found');
    }

    const rclTraditionId = rclResult[0].id;
    console.log('✅ RCL tradition ID:', rclTraditionId);

    // Check current state
    const currentSep7 = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1 AND date = $2',
      [rclTraditionId, '2025-09-07']
    );
    console.log(`📊 Current Sep 7, 2025 readings: ${currentSep7[0].count}`);

    // Delete all wrong RCL readings for June-November 2025
    console.log('🗑️ Deleting incorrect RCL readings for June-November 2025...');
    const deleteResult = await AppDataSource.query(`
      DELETE FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTraditionId]);

    console.log(`✅ Deleted ${deleteResult.rowCount || 0} incorrect readings`);

    // Verify September 7 is cleared
    const afterDelete = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1 AND date = $2',
      [rclTraditionId, '2025-09-07']
    );
    console.log(`📊 After deletion Sep 7, 2025 readings: ${afterDelete[0].count}`);

    if (parseInt(afterDelete[0].count) === 0) {
      console.log('✅ September 7, 2025 successfully cleared');
      console.log('🎉 PRODUCTION RCL FIX COMPLETED SUCCESSFULLY!');
      console.log('🔄 Next deployment will import correct Proper 18 readings');
    } else {
      console.log('❌ September 7, 2025 readings still exist');
    }

    await AppDataSource.destroy();
    console.log('📡 Database connection closed');

  } catch (error) {
    console.error('❌ Direct production fix failed:', error.message);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Execute the fix
directProductionFix();