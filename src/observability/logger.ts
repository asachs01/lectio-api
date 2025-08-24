import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import * as cls from 'cls-hooked';
import { Request, Response, NextFunction } from 'express';
import LokiTransport from 'winston-loki';
import * as api from '@opentelemetry/api';

// Create a namespace for request context
const requestContext = cls.createNamespace('request-context');

// Custom log levels
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: 'red bold',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'magenta',
  },
};

// Log format with correlation ID and trace context
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const correlationId = requestContext.get('correlationId') || 'system';
    const traceId = requestContext.get('traceId');
    const spanId = requestContext.get('spanId');
    const userId = requestContext.get('userId');
    const requestId = requestContext.get('requestId');
    
    const meta = {
      correlationId,
      ...(traceId && { traceId }),
      ...(spanId && { spanId }),
      ...(userId && { userId }),
      ...(requestId && { requestId }),
      ...info.metadata,
    };

    // Structured JSON logging
    return JSON.stringify({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: process.env.SERVICE_NAME || 'lectionary-api',
      environment: process.env.NODE_ENV || 'development',
      ...meta,
      ...(info.stack && { stack: info.stack }),
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf((info) => {
    const correlationId = requestContext.get('correlationId') || 'system';
    const userId = requestContext.get('userId');
    
    let message = `${info.timestamp} [${info.level}] [${correlationId}]`;
    if (userId) message += ` [user:${userId}]`;
    message += `: ${info.message}`;
    
    if (info.stack) {
      message += `\n${info.stack}`;
    }
    
    return message;
  })
);

class LoggerService {
  private logger: winston.Logger;
  private static instance: LoggerService;

  private constructor() {
    const transports: winston.transport[] = [];

    // Console transport
    if (process.env.NODE_ENV !== 'test') {
      transports.push(
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
        })
      );
    }

    // File transports
    if (process.env.LOG_TO_FILE === 'true') {
      // Error log file
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        })
      );

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
        })
      );
    }

    // Loki transport for Grafana
    if (process.env.LOKI_URL) {
      transports.push(
        new LokiTransport({
          host: process.env.LOKI_URL,
          labels: {
            app: 'lectionary-api',
            environment: process.env.NODE_ENV || 'development',
            version: process.env.SERVICE_VERSION || '1.0.0',
          },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => {
            console.error('Loki connection error:', err);
          },
        })
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      levels: customLevels.levels,
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: 'logs/exceptions.log',
          format: logFormat,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: 'logs/rejections.log',
          format: logFormat,
        }),
      ],
    });

    // Add colors for console output
    winston.addColors(customLevels.colors);
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  // Core logging methods with metadata support
  public fatal(message: string, metadata?: any): void {
    this.logger.log('fatal', message, { metadata });
    
    // Also record in OpenTelemetry
    const span = api.trace.getActiveSpan();
    if (span) {
      span.addEvent('fatal_error', {
        message,
        ...metadata,
      });
    }
  }

  public error(message: string, error?: Error | any, metadata?: any): void {
    const meta = {
      ...metadata,
      ...(error && {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
      }),
    };
    
    this.logger.error(message, { metadata: meta });
    
    // Record in OpenTelemetry
    const span = api.trace.getActiveSpan();
    if (span && error) {
      span.recordException(error);
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  public warn(message: string, metadata?: any): void {
    this.logger.warn(message, { metadata });
    
    const span = api.trace.getActiveSpan();
    if (span) {
      span.addEvent('warning', {
        message,
        ...metadata,
      });
    }
  }

  public info(message: string, metadata?: any): void {
    this.logger.info(message, { metadata });
  }

  public debug(message: string, metadata?: any): void {
    this.logger.debug(message, { metadata });
  }

  public trace(message: string, metadata?: any): void {
    this.logger.log('trace', message, { metadata });
  }

  // HTTP request/response logging
  public logRequest(req: Request, metadata?: any): void {
    this.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: this.sanitizeHeaders(req.headers),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...metadata,
    });
  }

  public logResponse(req: Request, res: Response, duration: number, metadata?: any): void {
    const level = res.statusCode >= 500 ? 'error' : 
                  res.statusCode >= 400 ? 'warn' : 'info';
    
    this.logger.log(level, 'HTTP response', {
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ...metadata,
      },
    });
  }

  // Database query logging
  public logQuery(query: string, parameters?: any[], duration?: number): void {
    this.debug('Database query', {
      query: this.sanitizeQuery(query),
      parameters: parameters?.map(p => typeof p === 'string' && p.length > 100 ? `${p.substring(0, 100)}...` : p),
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  // Cache operations logging
  public logCacheHit(key: string, metadata?: any): void {
    this.trace('Cache hit', { key, ...metadata });
  }

  public logCacheMiss(key: string, metadata?: any): void {
    this.trace('Cache miss', { key, ...metadata });
  }

  public logCacheSet(key: string, ttl?: number, metadata?: any): void {
    this.trace('Cache set', { key, ttl, ...metadata });
  }

  // Business events logging
  public logBusinessEvent(event: string, metadata?: any): void {
    this.info(`Business event: ${event}`, metadata);
    
    const span = api.trace.getActiveSpan();
    if (span) {
      span.addEvent(event, metadata || {});
    }
  }

  // Security events logging
  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: any): void {
    const level = severity === 'critical' ? 'fatal' :
                  severity === 'high' ? 'error' :
                  severity === 'medium' ? 'warn' : 'info';
    
    this.logger.log(level, `Security event: ${event}`, {
      metadata: {
        security_event: event,
        severity,
        ...metadata,
      },
    });
  }

  // Audit logging
  public logAudit(action: string, userId: string, resource: string, metadata?: any): void {
    this.info('Audit log', {
      audit_action: action,
      user_id: userId,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  // Performance logging
  public logPerformance(operation: string, duration: number, metadata?: any): void {
    const level = duration > 5000 ? 'warn' :
                  duration > 1000 ? 'info' : 'debug';
    
    this.logger.log(level, `Performance: ${operation}`, {
      metadata: {
        operation,
        duration: `${duration}ms`,
        slow: duration > 1000,
        ...metadata,
      },
    });
  }

  // Helper methods
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/api_key\s*=\s*'[^']*'/gi, "api_key='[REDACTED]'");
  }

  // Get the raw Winston logger for advanced usage
  public getLogger(): winston.Logger {
    return this.logger;
  }
}

// Correlation ID middleware
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  requestContext.run(() => {
    // Generate or extract correlation ID
    const correlationId = (req.headers['x-correlation-id'] as string) || 
                         (req.headers['x-request-id'] as string) || 
                         uuidv4();
    
    // Extract trace context from OpenTelemetry
    const span = api.trace.getActiveSpan();
    const spanContext = span?.spanContext();
    
    // Set context values
    requestContext.set('correlationId', correlationId);
    requestContext.set('requestId', uuidv4());
    if (spanContext) {
      requestContext.set('traceId', spanContext.traceId);
      requestContext.set('spanId', spanContext.spanId);
    }
    
    // Set user context if available
    if ((req as any).user) {
      requestContext.set('userId', (req as any).user.id);
    }
    
    // Add correlation ID to response headers
    res.setHeader('X-Correlation-Id', correlationId);
    if (spanContext) {
      res.setHeader('X-Trace-Id', spanContext.traceId);
    }
    
    next();
  });
}

// Export singleton instance
export const logger = LoggerService.getInstance();