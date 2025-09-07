#!/usr/bin/env node

require('reflect-metadata');
const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config();

console.log('🚀 MANUALLY RUNNING RCL PROPER FIX ON PRODUCTION...');
console.log('🔧 Environment check:');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_NAME:', process.env.DB_NAME || 'lectionary_api');
console.log('DB_PORT:', process.env.DB_PORT || '5432');

// Production database connection
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: false,
  logging: false,
  entities: [path.join(__dirname, 'dist/models/*.entity.js')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runProductionFix() {
  try {
    console.log('\n📡 Connecting to production database...');
    await AppDataSource.initialize();
    console.log('✅ Production database connected successfully!');

    // Get RCL tradition ID
    const rclTraditions = await AppDataSource.query(
      'SELECT id FROM traditions WHERE abbreviation = $1',
      ['RCL']
    );

    if (rclTraditions.length === 0) {
      console.log('❌ RCL tradition not found in production database');
      return;
    }

    const rclTraditionId = rclTraditions[0].id;
    console.log('✅ Found RCL tradition ID:', rclTraditionId);

    // Check current state of September 7, 2025
    const sep7Current = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM readings 
       WHERE tradition_id = $1 AND date = '2025-09-07'`,
      [rclTraditionId]
    );
    
    console.log(`📊 Current September 7, 2025 readings count: ${sep7Current[0].count}`);

    // Delete all wrong RCL readings for 2025 summer/fall
    console.log('\n🗑️ Deleting wrong RCL readings for June-November 2025...');
    const deleteResult = await AppDataSource.query(`
      DELETE FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTraditionId]);

    console.log(`✅ Successfully deleted readings for 2025 summer/fall period`);

    // Verify September 7 is gone
    const sep7After = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM readings 
       WHERE tradition_id = $1 AND date = '2025-09-07'`,
      [rclTraditionId]
    );
    
    console.log(`📊 September 7, 2025 readings after deletion: ${sep7After[0].count}`);

    if (parseInt(sep7After[0].count) === 0) {
      console.log('✅ September 7, 2025 readings successfully removed');
      console.log('🔄 Production database is now ready for correct readings import');
      console.log('\n🚨 CRITICAL: You must now run the readings import script to add correct data');
      console.log('   This can be done by triggering a new deployment or running import manually');
    } else {
      console.log('❌ Failed to remove September 7, 2025 readings');
    }

    await AppDataSource.destroy();
    console.log('\n✅ Production fix preparation completed successfully');
    
  } catch (error) {
    console.error('\n❌ Production fix failed:', error.message);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the fix
runProductionFix();