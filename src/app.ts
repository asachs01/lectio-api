import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { apiRouter } from './routes';

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware with CSP configured for Swagger UI
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:'],
          fontSrc: ['\'self\''],
          upgradeInsecureRequests: null, // Disable HTTPS upgrade for development
        },
      },
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Request parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.API_VERSION || 'v1',
      });
    });

    // API documentation - enabled by default in production, can be disabled with SWAGGER_ENABLED=false
    const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
    if (swaggerEnabled) {
      this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Lectionary API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          tryItOutEnabled: true,
          filter: true,
          displayRequestDuration: true,
        },
      }));

      // Serve OpenAPI spec as JSON
      this.app.get('/api/docs.json', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
    }

    // API routes
    this.app.use('/api', apiRouter);

    // Root endpoint - API welcome page with comprehensive documentation
    this.app.get('/', (_req: Request, res: Response) => {
      const version = process.env.API_VERSION || 'v1';
      const baseUrl = `${_req.protocol}://${_req.get('host')}`;

      res.json({
        name: 'Lectionary API',
        description: 'A REST API providing lectionary readings and liturgical calendar data for Christian churches',
        version,
        documentation: {
          swagger: process.env.SWAGGER_ENABLED !== 'false' ? `${baseUrl}/api/docs` : null,
          openApiSpec: process.env.SWAGGER_ENABLED !== 'false' ? `${baseUrl}/api/docs.json` : null,
        },
        endpoints: {
          apiRoot: `${baseUrl}/api/${version}`,
          traditions: {
            url: `${baseUrl}/api/${version}/traditions`,
            description: 'List all supported lectionary traditions (RCL, Catholic, Episcopal, Lutheran)',
          },
          readings: {
            url: `${baseUrl}/api/${version}/readings`,
            description: 'Get scripture readings by date',
            examples: [
              `${baseUrl}/api/${version}/readings?date=2025-12-25&tradition=rcl`,
              `${baseUrl}/api/${version}/readings/today`,
              `${baseUrl}/api/${version}/readings/range?start=2025-12-01&end=2025-12-31`,
            ],
          },
          calendar: {
            url: `${baseUrl}/api/${version}/calendar`,
            description: 'Access liturgical calendar information',
            examples: [
              `${baseUrl}/api/${version}/calendar/current`,
              `${baseUrl}/api/${version}/calendar/2025`,
              `${baseUrl}/api/${version}/calendar/2025/seasons`,
            ],
          },
        },
        supportedTraditions: [
          { id: 'rcl', name: 'Revised Common Lectionary' },
          { id: 'catholic', name: 'Roman Catholic Lectionary' },
          { id: 'episcopal', name: 'Episcopal/Anglican Lectionary' },
        ],
        health: `${baseUrl}/health`,
        repository: 'https://github.com/yourusername/lectionary-api',
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: {
          statusCode: 404,
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
        },
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(port: number | string, callback?: () => void): void {
    this.app.listen(port, callback);
  }

  public getApp(): Application {
    return this.app;
  }
}