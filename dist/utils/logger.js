"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';
// Define custom log format
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const developmentFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
}));
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: logFormat === 'json' ? customFormat : developmentFormat,
    defaultMeta: { service: 'lectionary-api' },
    transports: [
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === 'production' ? customFormat : developmentFormat,
        }),
    ],
});
// Add file transports for production
if (process.env.NODE_ENV === 'production') {
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: customFormat,
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: customFormat,
    }));
}
// Create HTTP request logger
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
        };
        if (res.statusCode >= 400) {
            exports.logger.warn('HTTP Request', logData);
        }
        else {
            exports.logger.info('HTTP Request', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=logger.js.map