"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
const database_service_1 = require("./services/database.service");
const env_validation_1 = require("./config/env.validation");
// Load environment variables
(0, dotenv_1.config)();
async function bootstrap() {
    try {
        // Validate required environment variables before starting
        (0, env_validation_1.assertValidEnvironment)();
        // Initialize database connection
        await database_service_1.DatabaseService.initialize();
        logger_1.logger.info('Database connection established');
        // Create and start the application
        const app = new app_1.App();
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            logger_1.logger.info(`Lectionary API server running on port ${port}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
            if (process.env.NODE_ENV === 'development') {
                logger_1.logger.info(`API Documentation: http://localhost:${port}/api/docs`);
                logger_1.logger.info(`Health Check: http://localhost:${port}/health`);
            }
        });
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            await database_service_1.DatabaseService.disconnect();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            await database_service_1.DatabaseService.disconnect();
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=index.js.map