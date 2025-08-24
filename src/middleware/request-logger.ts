import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming Request', {
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
      logger.error('HTTP Response', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Response', logData);
    } else {
      logger.info('HTTP Response', logData);
    }
  });

  next();
};