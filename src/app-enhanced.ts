import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import statusMonitor from 'express-status-monitor';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

// Import observability components
import { telemetry } from './observability/telemetry';
import { metrics } from './observability/metrics';
import { logger } from './observability/logger';
import { 
  observabilityStack, 
  errorTracking, 
  metricsEndpoint,
  getStatusMonitorConfig 
} from './middleware/observability';
import { 
  healthCheckService,
  livenessProbe,
  readinessProbe,
  startupProbe,
  deepHealthCheck
} from './middleware/health-checks';
import { createRateLimiter, rateLimitStrategies } from './middleware/rate-limiter';

export class EnhancedApp {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeObservability();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private async initializeObservability(): Promise<void> {
    try {
      // Initialize OpenTelemetry
      await telemetry.initialize();
      logger.info('🔭 Observability initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize observability', error);
    }
  }

  private setupMiddleware(): void {
    // Status monitor (must be before other middleware)
    if (process.env.STATUS_MONITOR_ENABLED !== 'false') {
      this.app.use(statusMonitor(getStatusMonitorConfig()));
    }

    // Security middleware with CSP configured for Swagger UI
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https://api.github.com"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-Id'],
      exposedHeaders: ['X-Correlation-Id', 'X-Trace-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    }));

    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }));

    // Request parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
      type: ['application/json', 'application/json-patch+json'],
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb',
      parameterLimit: 1000,
    }));
    this.app.use(express.text({ limit: '1mb' }));

    // Apply observability middleware stack
    observabilityStack().forEach(middleware => {
      this.app.use(middleware);
    });

    // Apply rate limiting
    // Global rate limiting
    this.app.use('/api/', createRateLimiter('public'));
    
    // Endpoint-specific rate limiting
    this.app.use('/auth/login', createRateLimiter('login'));
    this.app.use('/auth/register', createRateLimiter('register'));
    this.app.use('/api/*/search', createRateLimiter('search'));
    this.app.use('/api/*/bulk', createRateLimiter('bulk'));

    // Dynamic rate limiting based on server load
    if (process.env.DYNAMIC_RATE_LIMITING === 'true') {
      this.app.use(rateLimitStrategies.dynamic());
    }
  }

  private setupRoutes(): void {
    // Health check endpoints
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0',
      });
    });

    // Kubernetes probes
    this.app.get('/health/live', livenessProbe);
    this.app.get('/health/ready', readinessProbe);
    this.app.get('/health/startup', startupProbe);
    this.app.get('/health/deep', deepHealthCheck);

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', metricsEndpoint);

    // API documentation
    if (process.env.SWAGGER_ENABLED !== 'false') {
      this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Lectionary API Documentation',
        customfavIcon: '/favicon.ico',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
          displayOperationId: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: 'none',
          tryItOutEnabled: true,
        },
      }));

      // Serve OpenAPI spec as JSON
      this.app.get('/api/docs.json', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
    }

    // API routes with versioning
    this.app.use('/api', apiRouter);

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        name: 'Lectionary API',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        documentation: process.env.SWAGGER_ENABLED !== 'false' ? '/api/docs' : null,
        health: {
          main: '/health',
          liveness: '/health/live',
          readiness: '/health/ready',
          startup: '/health/startup',
          deep: '/health/deep',
        },
        metrics: '/metrics',
        status: process.env.STATUS_MONITOR_ENABLED !== 'false' ? '/status' : null,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn('Route not found', {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
      });

      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // Use custom error tracking middleware
    this.app.use(errorTracking);
    
    // Fallback error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.fatal('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      
      // Give time to flush logs
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', {
        reason,
        promise,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP server closed');
          });
        }

        // Shutdown telemetry
        await telemetry.shutdown();
        
        // Close database connections
        // await database.close();
        
        // Close Redis connections
        // await redis.quit();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  private server: any;

  public listen(port: number | string, callback?: () => void): void {
    this.server = this.app.listen(port, () => {
      logger.info(`🚀 Lectionary API server started`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0',
        pid: process.pid,
        metrics: `http://localhost:${port}/metrics`,
        health: `http://localhost:${port}/health`,
        docs: process.env.SWAGGER_ENABLED !== 'false' ? `http://localhost:${port}/api/docs` : null,
        status: process.env.STATUS_MONITOR_ENABLED !== 'false' ? `http://localhost:${port}/status` : null,
      });
      
      if (callback) callback();
    });
  }

  public getApp(): Application {
    return this.app;
  }
}