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

interface SeasonData {
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  liturgicalYearId: string;
}

async function addMissingSeasons(): Promise<void> {
  try {
    console.log('🔧 Adding missing liturgical seasons (safe migration approach)...');
    
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
      WHERE tradition_id = $1 
      ORDER BY year
    `, [traditionId]);

    console.log(`Found ${liturgicalYears.length} liturgical years`);

    for (const litYear of liturgicalYears) {
      console.log(`\nProcessing liturgical year ${litYear.year} (${litYear.cycle})...`);
      
      // Get existing seasons for this liturgical year
      const existingSeasons = await AppDataSource.query(`
        SELECT name, start_date, end_date 
        FROM seasons 
        WHERE liturgical_year_id = $1
        ORDER BY start_date
      `, [litYear.id]);

      console.log(`  Existing seasons: ${existingSeasons.map((s: { name: string }) => s.name).join(', ')}`);

      // Generate complete liturgical calendar for this year
      const calendarInfo = LiturgicalCalendar.generateLiturgicalYear(litYear.year - 1); // Adjust for liturgical year calculation
      
      console.log(`  Expected seasons: ${calendarInfo.seasons.map(s => s.name).join(', ')}`);

      // Check which seasons are missing
      const existingSeasonNames = existingSeasons.map((s: { name: string }) => s.name);
      const seasonsToAdd: SeasonData[] = [];

      for (const expectedSeason of calendarInfo.seasons) {
        if (!existingSeasonNames.includes(expectedSeason.name)) {
          seasonsToAdd.push({
            name: expectedSeason.name,
            startDate: expectedSeason.startDate,
            endDate: expectedSeason.endDate,
            color: expectedSeason.color,
            liturgicalYearId: litYear.id,
          });
        }
      }

      if (seasonsToAdd.length === 0) {
        console.log(`  ✅ All seasons already exist for year ${litYear.year}`);
        continue;
      }

      console.log(`  📝 Adding ${seasonsToAdd.length} missing seasons...`);

      // Add missing seasons using raw SQL for safety
      for (const season of seasonsToAdd) {
        await AppDataSource.query(`
          INSERT INTO seasons (name, start_date, end_date, color, liturgical_year_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [
          season.name,
          season.startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
          season.endDate.toISOString().split('T')[0],
          season.color,
          season.liturgicalYearId,
        ]);

        console.log(`    ✓ Added season: ${season.name} (${season.startDate.toISOString().split('T')[0]} - ${season.endDate.toISOString().split('T')[0]})`);
      }
    }

    console.log('\n🎉 Missing seasons migration completed successfully!');

    // Verify the fix by checking August 31, 2025
    console.log('\n🔍 Verifying fix for August 31, 2025...');
    const testResult = await AppDataSource.query(`
      SELECT s.name, s.start_date, s.end_date, ly.year, ly.cycle
      FROM seasons s
      JOIN liturgical_years ly ON s.liturgical_year_id = ly.id
      JOIN traditions t ON ly.tradition_id = t.id
      WHERE t.abbreviation = 'RCL'
        AND s.start_date <= '2025-08-31'
        AND s.end_date >= '2025-08-31'
      LIMIT 1
    `);

    if (testResult.length > 0) {
      console.log(`✅ August 31, 2025 is now in season: ${testResult[0].name} (Year ${testResult[0].cycle} ${testResult[0].year})`);
    } else {
      console.log('❌ August 31, 2025 still has no season - migration may have failed');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error adding missing seasons:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  addMissingSeasons().then(() => {
    console.log('✅ Migration script finished successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

export { addMissingSeasons };