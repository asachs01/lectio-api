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

    // Root endpoint - API welcome page with HTML landing page
    this.app.get('/', (_req: Request, res: Response) => {
      const version = process.env.API_VERSION || 'v1';
      const baseUrl = `${_req.protocol}://${_req.get('host')}`;
      const docsUrl = `${baseUrl}/api/docs`;
      const apiRoot = `${baseUrl}/api/${version}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lectionary API - Scripture Readings for Christian Churches</title>
  <meta name="description" content="A modern REST API providing lectionary readings and liturgical calendar data for Christian churches. Supports RCL, Catholic, and Episcopal traditions.">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --text: #1f2937;
      --text-light: #6b7280;
      --bg: #ffffff;
      --bg-alt: #f9fafb;
      --border: #e5e7eb;
      --success: #10b981;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    header h1 { font-size: 3rem; margin-bottom: 16px; font-weight: 700; }
    header p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 32px; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      margin: 0 4px;
    }
    .cta-buttons { margin-top: 32px; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
      margin: 8px;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-primary { background: white; color: var(--primary); }
    .btn-secondary { background: transparent; color: white; border: 2px solid white; }
    section { padding: 64px 0; }
    section:nth-child(even) { background: var(--bg-alt); }
    h2 { font-size: 2rem; margin-bottom: 32px; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      transition: box-shadow 0.2s;
    }
    .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .card h3 { color: var(--primary); margin-bottom: 12px; font-size: 1.25rem; }
    .card p { color: var(--text-light); margin-bottom: 16px; }
    .endpoint {
      background: var(--bg-alt);
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.875rem;
      word-break: break-all;
      margin-bottom: 8px;
    }
    .method {
      display: inline-block;
      background: var(--success);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-right: 8px;
    }
    .traditions-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 24px; }
    .tradition-badge {
      background: white;
      border: 1px solid var(--border);
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
    }
    .code-example {
      background: #1e293b;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.875rem;
      margin-top: 16px;
    }
    .code-example .comment { color: #64748b; }
    .code-example .string { color: #a5d6ff; }
    footer {
      background: var(--text);
      color: white;
      padding: 48px 0;
      text-align: center;
    }
    footer a { color: #93c5fd; }
    footer p { margin: 8px 0; opacity: 0.8; }
    @media (max-width: 640px) {
      header h1 { font-size: 2rem; }
      header p { font-size: 1rem; }
      .btn { display: block; margin: 8px 0; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Lectionary API</h1>
      <p>A modern REST API providing lectionary readings and liturgical calendar data for Christian churches</p>
      <div>
        <span class="badge">Version ${version}</span>
        <span class="badge">OpenAPI 3.0</span>
        <span class="badge">Free & Open Source</span>
      </div>
      <div class="cta-buttons">
        <a href="${docsUrl}" class="btn btn-primary">View API Documentation</a>
        <a href="https://github.com/asachs01/lectio-api" class="btn btn-secondary">GitHub Repository</a>
      </div>
    </div>
  </header>

  <section>
    <div class="container">
      <h2>API Endpoints</h2>
      <div class="grid">
        <div class="card">
          <h3>Readings</h3>
          <p>Get scripture readings by date, tradition, or date range</p>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/readings/today</div>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/readings?date=2025-12-25</div>
        </div>
        <div class="card">
          <h3>Traditions</h3>
          <p>List and query supported lectionary traditions</p>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/traditions</div>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/traditions/rcl</div>
        </div>
        <div class="card">
          <h3>Calendar</h3>
          <p>Access liturgical calendar and season information</p>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/calendar/current</div>
          <div class="endpoint"><span class="method">GET</span>${apiRoot}/calendar/2025/seasons</div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2>Supported Traditions</h2>
      <p style="text-align: center; color: var(--text-light); margin-bottom: 24px;">
        Access readings from multiple Christian lectionary traditions
      </p>
      <div class="traditions-list">
        <div class="tradition-badge">Revised Common Lectionary (RCL)</div>
        <div class="tradition-badge">Roman Catholic</div>
        <div class="tradition-badge">Episcopal / Anglican</div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2>Quick Start</h2>
      <p style="text-align: center; color: var(--text-light); margin-bottom: 16px;">
        Get today's readings with a simple HTTP request
      </p>
      <div class="code-example">
<span class="comment"># Get today's readings for the Revised Common Lectionary</span>
curl "${apiRoot}/readings/today?tradition=rcl"

<span class="comment"># Get readings for a specific date</span>
curl "${apiRoot}/readings?date=2025-12-25&tradition=rcl"

<span class="comment"># List all available traditions</span>
curl "${apiRoot}/traditions"
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p><strong>Lectionary API</strong> - Open source scripture readings API</p>
      <p>
        <a href="${docsUrl}">API Documentation</a> &bull;
        <a href="https://github.com/asachs01/lectio-api">GitHub</a> &bull;
        <a href="${baseUrl}/health">Health Status</a>
      </p>
      <p style="margin-top: 16px; font-size: 0.875rem;">
        Built with Express.js &bull; MIT License
      </p>
    </div>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
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