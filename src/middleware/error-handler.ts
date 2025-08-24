import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: unknown;
}

export class HttpError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Type guard to handle different error types
  const appError = error as AppError;
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
    logger.error('Internal Server Error', errorLog);
  } else if (statusCode >= 400) {
    logger.warn('Client Error', errorLog);
  }

  // Prepare error response
  const errorResponse: Record<string, unknown> = {
    error: {
      message: appError.message || 'An error occurred',
      statusCode,
      timestamp: new Date().toISOString(),
    },
  };

  // Add additional details in development mode
  if (process.env.NODE_ENV === 'development') {
    (errorResponse.error as Record<string, unknown>).stack = appError.stack;
    (errorResponse.error as Record<string, unknown>).details = appError.details;
  }

  // Handle specific error types
  if (appError.name === 'ValidationError') {
    (errorResponse.error as Record<string, unknown>).message = 'Validation failed';
    (errorResponse.error as Record<string, unknown>).details = appError.details;
  }

  if (appError.name === 'UnauthorizedError') {
    (errorResponse.error as Record<string, unknown>).message = 'Unauthorized access';
  }

  if (appError.name === 'JsonWebTokenError') {
    (errorResponse.error as Record<string, unknown>).message = 'Invalid token';
  }

  if (appError.name === 'TokenExpiredError') {
    (errorResponse.error as Record<string, unknown>).message = 'Token expired';
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new HttpError(`Route ${req.originalUrl} not found`, 404);
  res.status(404).json({
    error: {
      message: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    },
  });
};