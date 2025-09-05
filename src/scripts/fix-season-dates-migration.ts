#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { LiturgicalCalendar } from '../utils/liturgical-calendar';

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
  logging: true,
  entities: [path.join(__dirname, '../dist/models/*.entity.js')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixSeasonDates(): Promise<void> {
  try {
    console.log('🔧 Fixing liturgical season dates (correcting year calculation bug)...');
    
    await AppDataSource.initialize();

    // Get RCL tradition
    const traditionResult = await AppDataSource.query(`
      SELECT id FROM traditions WHERE abbreviation = 'RCL' LIMIT 1
    `);
    
    if (traditionResult.length === 0) {
      throw new Error('RCL tradition not found');
    }
    
    const traditionId = traditionResult[0].id;
    console.log(`Found RCL tradition: ${traditionId}`);

    // Get liturgical years for RCL tradition
    const liturgicalYears = await AppDataSource.query(`
      SELECT id, name, year, cycle, start_date, end_date 
      FROM liturgical_years 
      WHERE tradition_id = $1 AND year >= 2025
      ORDER BY year
    `, [traditionId]);

    console.log(`Found ${liturgicalYears.length} liturgical years (2025+)`);

    for (const litYear of liturgicalYears) {
      console.log(`\n🗑️  Deleting incorrect seasons for liturgical year ${litYear.year} (${litYear.cycle})...`);
      
      // Delete all seasons for this liturgical year
      const deleteResult = await AppDataSource.query(`
        DELETE FROM seasons WHERE liturgical_year_id = $1
      `, [litYear.id]);
      
      console.log(`  Deleted ${deleteResult[1]} season records`);

      // Generate correct liturgical calendar for this year
      const calendarInfo = LiturgicalCalendar.generateLiturgicalYear(litYear.year);
      
      console.log(`  📝 Adding ${calendarInfo.seasons.length} correct seasons...`);

      // Add correct seasons
      for (const season of calendarInfo.seasons) {
        const startDate = season.startDate.toISOString().split('T')[0];
        const endDate = season.endDate.toISOString().split('T')[0];
        
        console.log(`    Adding ${season.name}: ${startDate} to ${endDate}`);
        
        await AppDataSource.query(`
          INSERT INTO seasons (name, start_date, end_date, color, liturgical_year_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [season.name, startDate, endDate, season.color, litYear.id]);
      }
      
      console.log(`  ✅ Fixed seasons for liturgical year ${litYear.year}`);
    }
    
    console.log('\n🎉 Season dates fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing season dates:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the migration
fixSeasonDates()
  .then(() => {
    console.log('Season dates migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Season dates migration failed:', error);
    process.exit(1);
  });