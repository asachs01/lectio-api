import 'reflect-metadata';
import { config } from 'dotenv';
import { App } from './app';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database.service';

// Load environment variables
config();

async function bootstrap(): Promise<void> {
  try {
    // Initialize database connection
    await DatabaseService.initialize();
    logger.info('Database connection established');

    // Create and start the application
    const app = new App();
    const port = process.env.PORT || 3000;
    
    app.listen(port, () => {
      logger.info(`Lectionary API server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API Documentation: http://localhost:${port}/api/docs`);
        logger.info(`Health Check: http://localhost:${port}/health`);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await DatabaseService.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await DatabaseService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();