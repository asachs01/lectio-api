#!/usr/bin/env ts-node

/**
 * Migration Script: Rename Daily Office tradition to BCP Daily Office
 *
 * This script migrates the legacy 'Daily' tradition to the new 'BCP' naming
 * to clearly distinguish it as the Book of Common Prayer Daily Office Lectionary.
 *
 * Run this script on production after deploying the updated code.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-tradition-names.ts
 *   OR
 *   node dist/scripts/migrate-tradition-names.js
 */

import { DataSource } from 'typeorm';
import { Tradition } from '../models/tradition.entity';
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
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lectionary_api',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: true,
  entities: [
    path.join(__dirname, '..', 'models', '*.entity{.ts,.js}'),
  ],
});

async function migrateTraditionNames() {
  console.log('🔄 Starting tradition name migration...');

  // Initialize database connection
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
  }

  try {
    const traditionRepo = AppDataSource.getRepository(Tradition);

    // Step 1: Check current state
    console.log('\n📊 Current traditions in database:');
    const allTraditions = await traditionRepo.find();
    allTraditions.forEach(t => {
      console.log(`  - ${t.name} (${t.abbreviation})`);
    });

    // Step 2: Find legacy 'Daily' tradition
    const legacyTradition = await traditionRepo.findOne({
      where: { abbreviation: 'Daily' },
    });

    if (legacyTradition) {
      console.log('\n🔧 Found legacy Daily tradition, migrating to BCP...');

      // Check if BCP already exists (conflict check)
      const existingBcp = await traditionRepo.findOne({
        where: { abbreviation: 'BCP' },
      });

      if (existingBcp) {
        console.log('⚠️  BCP tradition already exists!');
        console.log('   This may indicate the migration was partially completed.');
        console.log('   Manual review needed.');
        return;
      }

      // Update the tradition
      legacyTradition.name = 'BCP Daily Office Lectionary';
      legacyTradition.abbreviation = 'BCP';
      legacyTradition.description = 'Book of Common Prayer Daily Office readings (Morning and Evening Prayer). Two-year cycle used by Episcopal/Anglican churches for weekday worship.';

      await traditionRepo.save(legacyTradition);
      console.log('✅ Successfully migrated Daily -> BCP');
    } else {
      console.log('\n✓ No legacy Daily tradition found (already migrated or not present)');
    }

    // Step 3: Verify BCP tradition exists
    const bcpTradition = await traditionRepo.findOne({
      where: { abbreviation: 'BCP' },
    });

    if (bcpTradition) {
      console.log('\n✅ BCP Daily Office tradition confirmed:');
      console.log(`   Name: ${bcpTradition.name}`);
      console.log(`   Abbreviation: ${bcpTradition.abbreviation}`);
      console.log(`   Description: ${bcpTradition.description?.substring(0, 80)}...`);
    } else {
      console.log('\n⚠️  No BCP tradition found! Creating new one...');
      const newTradition = traditionRepo.create({
        name: 'BCP Daily Office Lectionary',
        abbreviation: 'BCP',
        description: 'Book of Common Prayer Daily Office readings (Morning and Evening Prayer). Two-year cycle used by Episcopal/Anglican churches for weekday worship.',
      });
      await traditionRepo.save(newTradition);
      console.log('✅ Created new BCP Daily Office tradition');
    }

    // Step 4: List all traditions after migration
    console.log('\n📊 Final traditions in database:');
    const finalTraditions = await traditionRepo.find({ order: { name: 'ASC' } });
    finalTraditions.forEach(t => {
      console.log(`  - ${t.name} (${t.abbreviation})`);
    });

    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  migrateTraditionNames().catch(console.error);
}

export { migrateTraditionNames };
