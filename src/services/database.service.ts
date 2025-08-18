import { DataSource } from 'typeorm';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static dataSource: DataSource;

  public static async initialize(): Promise<void> {
    try {
      this.dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'lectionary_api',
        ssl: process.env.DB_SSL === 'true',
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        entities: [__dirname + '/../models/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        subscribers: [__dirname + '/../subscribers/*{.ts,.js}'],
        maxQueryExecutionTime: 5000,
        extra: {
          connectionLimit: 10,
          idleTimeout: 60000,
          acquireTimeout: 60000,
        },
      });

      await this.dataSource.initialize();
      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      logger.info('Database connection closed');
    }
  }

  public static getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database connection not initialized');
    }
    return this.dataSource;
  }

  public static async isHealthy(): Promise<boolean> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        return false;
      }
      
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}