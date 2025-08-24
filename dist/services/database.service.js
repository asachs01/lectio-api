"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const typeorm_1 = require("typeorm");
const logger_1 = require("../utils/logger");
const database_config_1 = require("../config/database.config");
class DatabaseService {
    static async initialize() {
        try {
            this.dataSource = new typeorm_1.DataSource((0, database_config_1.getDatabaseConfig)());
            await this.dataSource.initialize();
            logger_1.logger.info('Database connection initialized successfully');
            logger_1.logger.info(`Connected to database: ${this.dataSource.options.database}`);
            // Log entity information in development
            if (process.env.NODE_ENV === 'development') {
                const entityCount = this.dataSource.entityMetadatas.length;
                logger_1.logger.info(`Loaded ${entityCount} entities:`);
                this.dataSource.entityMetadatas.forEach(metadata => {
                    logger_1.logger.info(`  - ${metadata.name} (table: ${metadata.tableName})`);
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize database connection:', error);
            throw error;
        }
    }
    static async disconnect() {
        if (this.dataSource && this.dataSource.isInitialized) {
            await this.dataSource.destroy();
            logger_1.logger.info('Database connection closed');
        }
    }
    static getDataSource() {
        if (!this.dataSource || !this.dataSource.isInitialized) {
            throw new Error('Database connection not initialized');
        }
        return this.dataSource;
    }
    static async isHealthy() {
        try {
            if (!this.dataSource || !this.dataSource.isInitialized) {
                return false;
            }
            await this.dataSource.query('SELECT 1');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return false;
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map