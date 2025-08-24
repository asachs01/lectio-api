#!/usr/bin/env ts-node

/**
 * Database connection test script
 * Tests the database configuration and connection without starting the full app
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { DatabaseService } from '../services/database.service';

// Load environment variables
config();

async function testDatabaseConnection(): Promise<void> {
  console.log('🔍 Testing database connection...\n');
  
  try {
    console.log('Database Configuration:');
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`  Database: ${process.env.DB_NAME || 'lectionary_api'}`);
    console.log(`  Username: ${process.env.DB_USERNAME || 'postgres'}`);
    console.log(`  SSL: ${process.env.DB_SSL === 'true'}\n`);
    
    // Initialize database connection
    console.log('Initializing database connection...');
    await DatabaseService.initialize();
    console.log('✅ Database connection successful!\n');
    
    // Test database health
    console.log('Testing database health...');
    const isHealthy = await DatabaseService.isHealthy();
    console.log(`Database health: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);
    
    // Get data source info
    const dataSource = DatabaseService.getDataSource();
    console.log('Database Information:');
    console.log(`  Driver: ${dataSource.driver.database}`);
    console.log(`  Connected: ${dataSource.isInitialized}`);
    console.log(`  Entities loaded: ${dataSource.entityMetadatas.length}`);
    
    // List entities
    console.log('\nLoaded Entities:');
    dataSource.entityMetadatas.forEach(metadata => {
      console.log(`  - ${metadata.name} → ${metadata.tableName}`);
      console.log(`    Columns: ${metadata.columns.length}`);
      console.log(`    Indexes: ${metadata.indices.length}`);
      console.log(`    Relations: ${metadata.relations.length}`);
    });
    
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up connection
    try {
      await DatabaseService.disconnect();
      console.log('Connection closed.');
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConnection();
}

export { testDatabaseConnection };