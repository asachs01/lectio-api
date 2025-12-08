"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const routes_1 = require("./routes");
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        // Security middleware with CSP configured for Swagger UI
        this.app.use((0, helmet_1.default)({
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
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        }));
        // Compression middleware
        this.app.use((0, compression_1.default)());
        // Rate limiting
        const limiter = (0, express_rate_limit_1.default)({
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
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging
        this.app.use(request_logger_1.requestLogger);
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (_req, res) => {
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
            this.app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
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
            this.app.get('/api/docs.json', (_req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(swagger_1.swaggerSpec);
            });
        }
        // API routes
        this.app.use('/api', routes_1.apiRouter);
        // Root endpoint - API welcome page with comprehensive documentation
        this.app.get('/', (_req, res) => {
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
        this.app.use('*', (req, res) => {
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
    setupErrorHandling() {
        this.app.use(error_handler_1.errorHandler);
    }
    listen(port, callback) {
        this.app.listen(port, callback);
    }
    getApp() {
        return this.app;
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map