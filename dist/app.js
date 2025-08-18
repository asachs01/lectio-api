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
        // Security middleware
        this.app.use((0, helmet_1.default)());
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
        // API documentation
        if (process.env.SWAGGER_ENABLED === 'true') {
            this.app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
                explorer: true,
                customCss: '.swagger-ui .topbar { display: none }',
                customSiteTitle: 'Lectionary API Documentation',
            }));
        }
        // API routes
        this.app.use('/api', routes_1.apiRouter);
        // Root endpoint
        this.app.get('/', (_req, res) => {
            res.json({
                message: 'Lectionary API',
                version: process.env.API_VERSION || 'v1',
                documentation: process.env.SWAGGER_ENABLED === 'true' ? '/api/docs' : null,
                health: '/health',
            });
        });
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
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