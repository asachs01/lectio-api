"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.HttpError = void 0;
const logger_1 = require("../utils/logger");
class HttpError extends Error {
    constructor(message, statusCode = 500, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.HttpError = HttpError;
const errorHandler = (error, req, res, _next) => {
    // Type guard to handle different error types
    const appError = error;
    const statusCode = appError.statusCode || 500;
    const isOperational = appError.isOperational || false;
    // Log error details
    const errorLog = {
        message: appError.message || 'Unknown error',
        statusCode,
        isOperational,
        stack: appError.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query,
    };
    if (statusCode >= 500) {
        logger_1.logger.error('Internal Server Error', errorLog);
    }
    else if (statusCode >= 400) {
        logger_1.logger.warn('Client Error', errorLog);
    }
    // Prepare error response
    const errorResponse = {
        error: {
            message: appError.message || 'An error occurred',
            statusCode,
            timestamp: new Date().toISOString(),
        },
    };
    // Add additional details in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = appError.stack;
        errorResponse.error.details = appError.details;
    }
    // Handle specific error types
    if (appError.name === 'ValidationError') {
        errorResponse.error.message = 'Validation failed';
        errorResponse.error.details = appError.details;
    }
    if (appError.name === 'UnauthorizedError') {
        errorResponse.error.message = 'Unauthorized access';
    }
    if (appError.name === 'JsonWebTokenError') {
        errorResponse.error.message = 'Invalid token';
    }
    if (appError.name === 'TokenExpiredError') {
        errorResponse.error.message = 'Token expired';
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res) => {
    const error = new HttpError(`Route ${req.originalUrl} not found`, 404);
    res.status(404).json({
        error: {
            message: error.message,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString(),
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error-handler.js.map