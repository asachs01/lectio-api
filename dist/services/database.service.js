"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const typeorm_1 = require("typeorm");
const logger_1 = require("../utils/logger");
class DatabaseService {
    static async initialize() {
        try {
            this.dataSource = new typeorm_1.DataSource({
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
            logger_1.logger.info('Database connection initialized successfully');
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