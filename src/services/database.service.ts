import { DataSource } from 'typeorm';
import { logger } from '../utils/logger';
import { getDatabaseConfig } from '../config/database.config';

export class DatabaseService {
  private static dataSource: DataSource;

  public static async initialize(): Promise<void> {
    try {
      this.dataSource = new DataSource(getDatabaseConfig());

      await this.dataSource.initialize();
      logger.info('Database connection initialized successfully');
      logger.info(`Connected to database: ${this.dataSource.options.database}`);
      
      // Log entity information in development
      if (process.env.NODE_ENV === 'development') {
        const entityCount = this.dataSource.entityMetadatas.length;
        logger.info(`Loaded ${entityCount} entities:`);
        this.dataSource.entityMetadatas.forEach(metadata => {
          logger.info(`  - ${metadata.name} (table: ${metadata.tableName})`);
        });
      }
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