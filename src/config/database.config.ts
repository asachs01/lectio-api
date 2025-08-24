import { DataSourceOptions } from 'typeorm';
import { entities } from '../models';

export const getDatabaseConfig = (): DataSourceOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lectionary_api',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: isDevelopment && process.env.DB_SYNC !== 'false',
    logging: isDevelopment 
      ? (process.env.DB_LOGGING?.split(',') as any[]) || ['query', 'error', 'warn']
      : ['error'],
    entities,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    subscribers: [__dirname + '/../subscribers/*{.ts,.js}'],
    maxQueryExecutionTime: parseInt(process.env.DB_QUERY_TIMEOUT || '5000'),
    
    // Connection pool configuration
    extra: {
      // Maximum number of connections in the pool
      max: parseInt(process.env.DB_POOL_SIZE || (isProduction ? '20' : '10')),
      // Minimum number of connections in the pool
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      // Maximum time (in milliseconds) that a connection can remain idle
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      // Maximum time (in milliseconds) to wait for a connection
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      // Maximum time (in milliseconds) that a connection can exist
      maxLifetimeSeconds: parseInt(process.env.DB_CONNECTION_LIFETIME || '600'),
      // Enable connection validation before use
      testOnBorrow: process.env.DB_TEST_ON_BORROW !== 'false',
      // Additional PostgreSQL-specific options
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '5000'),
      application_name: process.env.DB_APP_NAME || 'lectio-api',
    },
    
    // Connection retry configuration
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
    
    // Entity and migration paths
    migrationsRun: isProduction && process.env.DB_AUTO_MIGRATE === 'true',
    dropSchema: false, // Never automatically drop schema
    
    // Connection naming for debugging
    name: process.env.DB_CONNECTION_NAME || 'default',
  };
};

export default getDatabaseConfig;