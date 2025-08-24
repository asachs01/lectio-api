"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // Log incoming request
    logger_1.logger.info('Incoming Request', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
    });
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length'),
            ip: req.ip || req.connection?.remoteAddress,
        };
        if (res.statusCode >= 500) {
            logger_1.logger.error('HTTP Response', logData);
        }
        else if (res.statusCode >= 400) {
            logger_1.logger.warn('HTTP Response', logData);
        }
        else {
            logger_1.logger.info('HTTP Response', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=request-logger.js.map