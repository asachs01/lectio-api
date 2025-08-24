import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

// Import from compiled JS when in production, TS when in development
let getDatabaseConfig: () => any;

try {
  // Try to import from TypeScript source first
  getDatabaseConfig = require('./src/config/database.config').getDatabaseConfig;
} catch (error) {
  // Fall back to compiled JavaScript
  getDatabaseConfig = require('./dist/config/database.config').getDatabaseConfig;
}

// Create DataSource for TypeORM CLI
export const AppDataSource = new DataSource(getDatabaseConfig());

export default AppDataSource;