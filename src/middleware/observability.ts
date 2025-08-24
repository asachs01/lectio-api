import { Request, Response, NextFunction } from 'express';
import * as api from '@opentelemetry/api';
import { metrics } from '../observability/metrics';
import { logger, correlationIdMiddleware } from '../observability/logger';
import { v4 as uuidv4 } from 'uuid';

// Extended Request interface with tracking properties
interface TrackedRequest extends Request {
  startTime?: number;
  correlationId?: string;
  span?: api.Span;
  metrics?: {
    dbQueries: number;
    cacheHits: number;
    cacheMisses: number;
    externalApiCalls: number;
  };
}

// Performance tracking middleware
export function performanceTracking(req: TrackedRequest, res: Response, next: NextFunction): void {
  req.startTime = Date.now();
  
  // Initialize metrics tracking
  req.metrics = {
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    externalApiCalls: 0,
  };

  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    if (req.startTime) {
      const duration = Date.now() - req.startTime;
      const route = req.route?.path || req.path;
      
      // Record metrics
      metrics.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration / 1000,
        req.query.tradition as string
      );
      
      // Log performance if slow
      if (duration > 1000) {
        logger.logPerformance(`${req.method} ${route}`, duration, {
          statusCode: res.statusCode,
          metrics: req.metrics,
        });
      }
      
      // Add performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Server-Time', new Date().toISOString());
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// OpenTelemetry tracing middleware
export function tracingMiddleware(req: TrackedRequest, res: Response, next: NextFunction): void {
  const tracer = api.trace.getTracer('lectionary-api');
  const spanName = `${req.method} ${req.route?.path || req.path}`;
  
  // Extract parent context from headers
  const propagator = api.propagation;
  const parentContext = propagator.extract(
    api.context.active(),
    req.headers
  );
  
  // Start a new span
  const span = tracer.startSpan(
    spanName,
    {
      kind: api.SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.user_agent': req.get('user-agent'),
        'http.request_content_length': req.get('content-length'),
        'net.peer.ip': req.ip,
        'net.peer.port': req.socket.remotePort,
      },
    },
    parentContext
  );
  
  // Store span in request for later use
  req.span = span;
  
  // Set span as active
  api.context.with(api.trace.setSpan(parentContext, span), () => {
    // Track response
    const originalSend = res.send;
    res.send = function(data: any) {
      res.send = originalSend;
      
      // Add response attributes
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': res.get('content-length'),
      });
      
      // Set span status based on HTTP status
      if (res.statusCode >= 400) {
        span.setStatus({
          code: api.SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: api.SpanStatusCode.OK });
      }
      
      // End the span
      span.end();
      
      return originalSend.call(this, data);
    };
    
    next();
  });
}

// Request/Response logging middleware
export function requestResponseLogging(req: TrackedRequest, res: Response, next: NextFunction): void {
  // Log request
  logger.logRequest(req, {
    correlationId: req.correlationId,
    span: req.span?.spanContext(),
  });
  
  // Capture request body size
  if (req.body) {
    const bodySize = JSON.stringify(req.body).length;
    metrics.recordRequestSize(req.method, req.route?.path || req.path, bodySize);
  }
  
  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    // Log response
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    logger.logResponse(req, res, duration, {
      correlationId: req.correlationId,
      responseSize: data ? JSON.stringify(data).length : 0,
    });
    
    // Record response size
    if (data) {
      const responseSize = JSON.stringify(data).length;
      metrics.recordResponseSize(req.method, req.route?.path || req.path, responseSize);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// Error tracking middleware
export function errorTracking(error: Error, req: TrackedRequest, res: Response, next: NextFunction): void {
  const errorId = uuidv4();
  
  // Log error with context
  logger.error(`Request error: ${error.message}`, error, {
    errorId,
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    user: (req as any).user?.id,
  });
  
  // Record error in metrics
  metrics.recordError(
    error.name || 'UnknownError',
    error.message,
    req.route?.path || req.path
  );
  
  // Record exception in span if available
  if (req.span) {
    req.span.recordException(error);
    req.span.setStatus({
      code: api.SpanStatusCode.ERROR,
      message: error.message,
    });
  }
  
  // Send error response
  const statusCode = (error as any).statusCode || 500;
  res.status(statusCode).json({
    error: {
      id: errorId,
      message: error.message,
      code: (error as any).code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    },
    correlationId: req.correlationId,
  });
}

// Business metrics tracking
export function businessMetricsMiddleware(req: TrackedRequest, res: Response, next: NextFunction): void {
  // Track specific business events based on endpoints
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    if (res.statusCode < 400) {
      const route = req.route?.path || req.path;
      
      // Track readings requests
      if (route.includes('/readings')) {
        const tradition = req.query.tradition as string || 'default';
        const dateType = req.path.includes('today') ? 'today' : 
                        req.path.includes('range') ? 'range' : 'specific';
        const cacheHit = res.getHeader('X-Cache-Hit') === 'true';
        
        metrics.recordReadingRequest(tradition, dateType, cacheHit);
      }
      
      // Track tradition access
      if (route.includes('/traditions')) {
        const traditionId = req.params.id || 'list';
        const operation = req.method.toLowerCase();
        metrics.recordTraditionAccess(traditionId, operation);
      }
      
      // Track calendar queries
      if (route.includes('/calendar')) {
        const year = req.params.year || new Date().getFullYear().toString();
        const season = req.query.season as string || 'all';
        const tradition = req.query.tradition as string || 'default';
        metrics.recordCalendarQuery(year, season, tradition);
      }
      
      // Track search queries
      if (route.includes('/search')) {
        const searchType = req.query.type as string || 'general';
        const results = Array.isArray(data) ? data.length : 
                       data?.results ? data.results.length : 0;
        metrics.recordSearchQuery(searchType, results);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// Security monitoring middleware
export function securityMonitoring(req: TrackedRequest, res: Response, next: NextFunction): void {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|onerror=|onload=)/i,  // XSS attempts
    /(union.*select|select.*from|insert.*into|delete.*from)/i,  // SQL injection
    /(\.\.\/|\.\.\\)/,  // Path traversal
    /(\${|{{|<%)/,  // Template injection
  ];
  
  const checkString = JSON.stringify({
    path: req.path,
    query: req.query,
    body: req.body,
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.logSecurityEvent('Suspicious pattern detected', 'medium', {
        pattern: pattern.toString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      // Optionally block the request
      if (process.env.BLOCK_SUSPICIOUS_REQUESTS === 'true') {
        return res.status(400).json({
          error: 'Invalid request',
          correlationId: req.correlationId,
        });
      }
    }
  }
  
  // Track authentication failures
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.logSecurityEvent('Authentication failure', 'low', {
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// Audit logging middleware
export function auditLogging(req: TrackedRequest, res: Response, next: NextFunction): void {
  // Only audit state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalSend = res.send;
    res.send = function(data: any) {
      res.send = originalSend;
      
      if (res.statusCode < 400) {
        const userId = (req as any).user?.id || 'anonymous';
        const resource = req.route?.path || req.path;
        const action = `${req.method} ${resource}`;
        
        logger.logAudit(action, userId, resource, {
          correlationId: req.correlationId,
          body: req.body,
          query: req.query,
          params: req.params,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
}

// Combined observability middleware stack
export function observabilityStack() {
  return [
    correlationIdMiddleware,
    performanceTracking,
    tracingMiddleware,
    requestResponseLogging,
    businessMetricsMiddleware,
    securityMonitoring,
    auditLogging,
  ];
}

// Prometheus metrics endpoint
export function metricsEndpoint(req: Request, res: Response): void {
  res.set('Content-Type', metrics.getRegister().contentType);
  metrics.getRegister().metrics().then(data => {
    res.end(data);
  }).catch(err => {
    res.status(500).end(err);
  });
}

// Status monitor configuration
export function getStatusMonitorConfig() {
  return {
    title: 'Lectionary API Status',
    path: '/status',
    spans: [
      {
        interval: 1,
        retention: 60,
      },
      {
        interval: 5,
        retention: 60,
      },
      {
        interval: 15,
        retention: 60,
      },
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      eventLoop: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true,
    },
    healthChecks: [
      {
        protocol: 'http',
        host: 'localhost',
        path: '/health/live',
        port: process.env.PORT || '3000',
      },
      {
        protocol: 'http',
        host: 'localhost',
        path: '/health/ready',
        port: process.env.PORT || '3000',
      },
    ],
  };
}