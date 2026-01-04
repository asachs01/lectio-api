#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

// Simple database initialization script
async function initDatabase(): Promise<void> {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lectionary_api',
    synchronize: true, // This will create tables
    logging: true,
    entities: [
      path.join(__dirname, '../models/*.entity.ts'),
    ],
  });

  try {
    console.log('Initializing database connection...');
    console.log('Database config:', {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'lectionary_api',
      username: process.env.DB_USERNAME || 'postgres',
    });
    
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');
    console.log('✅ Schema synchronized');
    
    // Test query
    const result = await AppDataSource.query('SELECT version()');
    console.log('Database version:', result[0].version);
    
    // List tables
    const tables = await AppDataSource.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('\nCreated tables:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.tablename}`);
    });
    
    await AppDataSource.destroy();
    console.log('\n✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

export { initDatabase };