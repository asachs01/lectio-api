#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

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
  entities: process.env.NODE_ENV === 'production' 
    ? [path.join(__dirname, '../models/*.entity.js')]
    : [path.join(__dirname, '../models/*.entity.ts')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
}

async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running database migrations...\n');
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Create migrations table if it doesn't exist
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of executed migrations
    const executedMigrations = await AppDataSource.query<MigrationRecord[]>(
      'SELECT name FROM migrations',
    );
    const executedNames = new Set(executedMigrations.map(m => m.name));

    // Define migrations to run (in order)
    const migrations = [
      {
        name: 'fix-rcl-proper-2025-09',
        script: 'fix-rcl-proper-readings.ts',
        description: 'Fix RCL Proper calculations for September 2025',
      },
      // Add more migrations here as needed
    ];

    let migrationsRun = 0;
    
    for (const migration of migrations) {
      if (executedNames.has(migration.name)) {
        console.log(`⏭️  Skipping ${migration.name} (already executed)`);
        continue;
      }

      console.log(`\n🚀 Running migration: ${migration.name}`);
      console.log(`   ${migration.description}`);
      
      try {
        // Run the migration script
        const scriptPath = path.join(__dirname, migration.script);
        if (!fs.existsSync(scriptPath)) {
          console.log(`   ⚠️  Script not found: ${scriptPath}`);
          continue;
        }

        execSync(`npx ts-node ${scriptPath}`, {
          encoding: 'utf8',
          stdio: 'inherit',
        });

        // Record the migration as executed
        await AppDataSource.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name],
        );
        
        console.log(`   ✅ Migration ${migration.name} completed`);
        migrationsRun++;
        
      } catch (error) {
        console.error(`   ❌ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }

    console.log(`\n✅ Migrations complete: ${migrationsRun} migration(s) run`);
    
    await AppDataSource.destroy();
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run migrations
if (require.main === module) {
  runMigrations();
}