import { register, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import * as api from '@opentelemetry/api';
import { telemetry } from './telemetry';

export class MetricsService {
  private static instance: MetricsService;
  
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Summary<string>;
  private httpResponseSize: Summary<string>;
  
  // Business metrics
  private readingsRequested: Counter<string>;
  private traditionsAccessed: Counter<string>;
  private calendarQueriesTotal: Counter<string>;
  private searchQueriesTotal: Counter<string>;
  
  // System metrics
  private activeConnections: Gauge<string>;
  private databaseConnectionPool: Gauge<string>;
  private cacheHitRatio: Gauge<string>;
  private queueSize: Gauge<string>;
  
  // Rate limiting metrics
  private rateLimitHits: Counter<string>;
  private rateLimitBlocked: Counter<string>;
  private rateLimitRemaining: Gauge<string>;
  
  // Error metrics
  private errorsTotal: Counter<string>;
  private validationFailures: Counter<string>;
  
  // OpenTelemetry metrics
  private otelMeter: api.Meter;
  private otelRequestCounter: api.Counter;
  private otelLatencyHistogram: api.Histogram;
  private otelActiveRequests: api.UpDownCounter;

  private constructor() {
    // Initialize Prometheus metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tradition'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [register],
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [register],
    });

    // Business metrics
    this.readingsRequested = new Counter({
      name: 'readings_requested_total',
      help: 'Total number of readings requested',
      labelNames: ['tradition', 'date_type', 'cache_hit'],
      registers: [register],
    });

    this.traditionsAccessed = new Counter({
      name: 'traditions_accessed_total',
      help: 'Total number of tradition data accesses',
      labelNames: ['tradition_id', 'operation'],
      registers: [register],
    });

    this.calendarQueriesTotal = new Counter({
      name: 'calendar_queries_total',
      help: 'Total number of calendar queries',
      labelNames: ['year', 'season', 'tradition'],
      registers: [register],
    });

    this.searchQueriesTotal = new Counter({
      name: 'search_queries_total',
      help: 'Total number of search queries',
      labelNames: ['search_type', 'result_count'],
      registers: [register],
    });

    // System metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [register],
    });

    this.databaseConnectionPool = new Gauge({
      name: 'database_connection_pool',
      help: 'Database connection pool status',
      labelNames: ['status'],
      registers: [register],
    });

    this.cacheHitRatio = new Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['cache_type'],
      registers: [register],
    });

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Size of various queues',
      labelNames: ['queue_name'],
      registers: [register],
    });

    // Rate limiting metrics
    this.rateLimitHits = new Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'client_type'],
      registers: [register],
    });

    this.rateLimitBlocked = new Counter({
      name: 'rate_limit_blocked_total',
      help: 'Total number of requests blocked by rate limiting',
      labelNames: ['endpoint', 'reason'],
      registers: [register],
    });

    this.rateLimitRemaining = new Gauge({
      name: 'rate_limit_remaining',
      help: 'Remaining rate limit for clients',
      labelNames: ['client_id', 'endpoint'],
      registers: [register],
    });

    // Error metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'code', 'endpoint'],
      registers: [register],
    });

    this.validationFailures = new Counter({
      name: 'validation_failures_total',
      help: 'Total number of validation failures',
      labelNames: ['field', 'endpoint'],
      registers: [register],
    });

    // Initialize OpenTelemetry metrics
    this.otelMeter = telemetry.getMeter('lectionary-api-metrics');
    
    this.otelRequestCounter = this.otelMeter.createCounter('api_requests', {
      description: 'Total number of API requests',
    });

    this.otelLatencyHistogram = this.otelMeter.createHistogram('api_latency', {
      description: 'API request latency',
      unit: 'ms',
    });

    this.otelActiveRequests = this.otelMeter.createUpDownCounter('active_requests', {
      description: 'Number of active API requests',
    });

    // Collect default Node.js metrics
    collectDefaultMetrics({
      register,
      prefix: 'lectionary_api_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // HTTP metrics methods
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number, tradition?: string): void {
    const labels = { method, route, status_code: statusCode.toString() };
    if (tradition) {
      Object.assign(labels, { tradition });
    }
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    
    // OpenTelemetry metrics
    this.otelRequestCounter.add(1, { method, route, status_code: statusCode });
    this.otelLatencyHistogram.record(duration * 1000, { method, route });
  }

  public recordRequestSize(method: string, route: string, size: number): void {
    this.httpRequestSize.observe({ method, route }, size);
  }

  public recordResponseSize(method: string, route: string, size: number): void {
    this.httpResponseSize.observe({ method, route }, size);
  }

  // Business metrics methods
  public recordReadingRequest(tradition: string, dateType: string, cacheHit: boolean): void {
    this.readingsRequested.inc({ 
      tradition, 
      date_type: dateType, 
      cache_hit: cacheHit.toString() 
    });
  }

  public recordTraditionAccess(traditionId: string, operation: string): void {
    this.traditionsAccessed.inc({ tradition_id: traditionId, operation });
  }

  public recordCalendarQuery(year: string, season: string, tradition: string): void {
    this.calendarQueriesTotal.inc({ year, season, tradition });
  }

  public recordSearchQuery(searchType: string, resultCount: number): void {
    this.searchQueriesTotal.inc({ 
      search_type: searchType, 
      result_count: resultCount.toString() 
    });
  }

  // System metrics methods
  public setActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
    
    if (type === 'http') {
      this.otelActiveRequests.add(count);
    }
  }

  public setDatabasePoolStatus(status: string, count: number): void {
    this.databaseConnectionPool.set({ status }, count);
  }

  public setCacheHitRatio(cacheType: string, ratio: number): void {
    this.cacheHitRatio.set({ cache_type: cacheType }, ratio);
  }

  public setQueueSize(queueName: string, size: number): void {
    this.queueSize.set({ queue_name: queueName }, size);
  }

  // Rate limiting metrics methods
  public recordRateLimitHit(endpoint: string, clientType: string): void {
    this.rateLimitHits.inc({ endpoint, client_type: clientType });
  }

  public recordRateLimitBlock(endpoint: string, reason: string): void {
    this.rateLimitBlocked.inc({ endpoint, reason });
  }

  public setRateLimitRemaining(clientId: string, endpoint: string, remaining: number): void {
    this.rateLimitRemaining.set({ client_id: clientId, endpoint }, remaining);
  }

  // Error metrics methods
  public recordError(type: string, code: string, endpoint: string): void {
    this.errorsTotal.inc({ type, code, endpoint });
  }

  public recordValidationFailure(field: string, endpoint: string): void {
    this.validationFailures.inc({ field, endpoint });
  }

  // Get Prometheus registry for export
  public getRegister() {
    return register;
  }

  // Custom metric creation helpers
  public createCustomCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    return new Counter({
      name: `lectionary_api_${name}`,
      help,
      labelNames,
      registers: [register],
    });
  }

  public createCustomGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    return new Gauge({
      name: `lectionary_api_${name}`,
      help,
      labelNames,
      registers: [register],
    });
  }

  public createCustomHistogram(
    name: string, 
    help: string, 
    labelNames: string[] = [],
    buckets?: number[]
  ): Histogram<string> {
    return new Histogram({
      name: `lectionary_api_${name}`,
      help,
      labelNames,
      buckets: buckets || [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });
  }
}

export const metrics = MetricsService.getInstance();