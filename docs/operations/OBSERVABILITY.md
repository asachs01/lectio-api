# Lectionary API - Observability & Rate Limiting Guide

## 🎯 Overview

This document describes the comprehensive observability and rate limiting infrastructure implemented for the Lectionary API. The system provides:

- **Advanced Rate Limiting**: Multi-tier, endpoint-specific, and dynamic rate limiting
- **Distributed Tracing**: Full request tracing with OpenTelemetry
- **Metrics Collection**: Prometheus metrics with custom business KPIs
- **Structured Logging**: Correlation IDs and contextual logging
- **Health Checks**: Kubernetes-compatible liveness, readiness, and startup probes
- **Real-time Monitoring**: Grafana dashboards and alerts

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Add these variables to your `.env` file:

```env
# Observability Configuration
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
METRICS_PORT=9090
SERVICE_NAME=lectionary-api
SERVICE_VERSION=1.0.0

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOKI_URL=http://localhost:3100

# Rate Limiting
REDIS_URL=redis://localhost:6379
RATE_LIMIT_PUBLIC_REQUESTS=100
RATE_LIMIT_PUBLIC_WINDOW=900
RATE_LIMIT_AUTH_REQUESTS=1000
RATE_LIMIT_AUTH_WINDOW=900
RATE_LIMIT_PREMIUM_REQUESTS=10000
RATE_LIMIT_PREMIUM_WINDOW=900
DYNAMIC_RATE_LIMITING=true

# Monitoring
STATUS_MONITOR_ENABLED=true
SWAGGER_ENABLED=true
BLOCK_SUSPICIOUS_REQUESTS=false
```

### 3. Start Observability Stack

```bash
# Start all observability services
docker-compose -f docker-compose.observability.yml up -d

# Verify services are running
docker-compose -f docker-compose.observability.yml ps
```

### 4. Access Dashboards

- **Grafana**: http://localhost:3006 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **API Status**: http://localhost:3000/status
- **Metrics**: http://localhost:3000/metrics
- **Health**: http://localhost:3000/health

## 📊 Rate Limiting

### Tier-Based Limits

| Tier | Requests | Window | Block Duration |
|------|----------|--------|----------------|
| Public | 100 | 15 min | 15 min |
| Authenticated | 1000 | 15 min | 10 min |
| Premium | 10000 | 15 min | 5 min |
| Admin | 100000 | 15 min | 1 min |

### Endpoint-Specific Limits

| Endpoint | Requests | Window | Block Duration |
|----------|----------|--------|----------------|
| /auth/login | 5 | 15 min | 1 hour |
| /auth/register | 3 | 1 hour | 2 hours |
| /auth/password-reset | 3 | 1 hour | 1 hour |
| /api/*/search | 30 | 1 min | 5 min |
| /api/*/bulk | 10 | 1 hour | 30 min |

### Rate Limit Headers

All responses include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

### Dynamic Rate Limiting

When enabled, the system adjusts limits based on:
- CPU usage
- Memory consumption
- Event loop lag
- Database connection pool status

## 🔭 Distributed Tracing

### OpenTelemetry Integration

Every request is traced with:
- Unique trace ID
- Span hierarchy for operations
- Performance metrics
- Error tracking

### Trace Headers

- `X-Correlation-Id`: Request correlation ID
- `X-Trace-Id`: OpenTelemetry trace ID
- `traceparent`: W3C trace context

### Viewing Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service: `lectionary-api`
3. Find traces by:
   - Trace ID
   - Operation name
   - Time range
   - Tags (user_id, endpoint, etc.)

## 📈 Metrics

### System Metrics

- **HTTP Metrics**
  - `http_requests_total`: Total requests by method, route, status
  - `http_request_duration_seconds`: Request latency histogram
  - `http_request_size_bytes`: Request body size
  - `http_response_size_bytes`: Response body size

- **Performance Metrics**
  - `process_cpu_seconds_total`: CPU usage
  - `process_resident_memory_bytes`: Memory usage
  - `nodejs_heap_size_total_bytes`: Heap memory
  - `nodejs_eventloop_lag_seconds`: Event loop lag

### Business Metrics

- **Readings**
  - `readings_requested_total`: Reading requests by tradition
  - `cache_hit_ratio`: Cache effectiveness

- **Traditions**
  - `traditions_accessed_total`: Tradition data access

- **Calendar**
  - `calendar_queries_total`: Calendar queries by year/season

- **Search**
  - `search_queries_total`: Search usage and results

### Rate Limiting Metrics

- `rate_limit_hits_total`: Rate limit checks
- `rate_limit_blocked_total`: Blocked requests
- `rate_limit_remaining`: Remaining quota per client

### Custom Metrics

Add custom metrics in your code:

```typescript
import { metrics } from './observability/metrics';

// Counter
metrics.recordBusinessEvent('order_created', { 
  amount: 100, 
  currency: 'USD' 
});

// Gauge
metrics.setQueueSize('email_queue', 42);

// Histogram
metrics.recordPerformance('database_query', 125);
```

## 📝 Structured Logging

### Log Levels

- `fatal`: Application crash imminent
- `error`: Error occurred but recovered
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug information
- `trace`: Detailed trace information

### Correlation IDs

Every log entry includes:
- `correlationId`: Request correlation ID
- `traceId`: OpenTelemetry trace ID
- `spanId`: Current span ID
- `userId`: Authenticated user ID (if applicable)

### Log Aggregation

Logs are shipped to Loki for centralized storage and querying:

1. Open Grafana: http://localhost:3006
2. Go to Explore
3. Select Loki datasource
4. Query examples:
   ```
   {app="lectionary-api"} |= "error"
   {app="lectionary-api"} |= "correlationId" |= "abc-123"
   {app="lectionary-api"} | json | level="error"
   ```

## 🏥 Health Checks

### Endpoints

- `/health`: Basic health check
- `/health/live`: Kubernetes liveness probe
- `/health/ready`: Kubernetes readiness probe
- `/health/startup`: Kubernetes startup probe
- `/health/deep`: Comprehensive system analysis

### Health Check Response

```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": {
      "status": "pass|warn|fail",
      "message": "Database is accessible",
      "duration": 15
    },
    "redis": {
      "status": "pass",
      "message": "Redis is accessible",
      "duration": 3
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage: 45.2%",
      "metadata": {
        "heapUsed": "123.45 MB",
        "heapTotal": "256.00 MB"
      }
    }
  },
  "ready": true,
  "dependencies": {
    "database": true,
    "redis": true
  }
}
```

## 📊 Grafana Dashboards

### Pre-configured Dashboards

1. **API Overview**: High-level metrics
   - Request rate
   - Error rate
   - P50/P95/P99 latency
   - Status code distribution

2. **Performance Dashboard**: System performance
   - CPU and memory usage
   - Event loop lag
   - Database connection pool
   - Cache hit rates

3. **Business Metrics**: Application-specific KPIs
   - Readings by tradition
   - Popular endpoints
   - Search patterns
   - User activity

### Creating Custom Dashboards

1. Open Grafana: http://localhost:3006
2. Create new dashboard
3. Add panels with Prometheus queries
4. Save and share

## 🚨 Alerting

### Alert Rules

Configure alerts in `observability/alerts/rules.yml`:

```yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
```

### Notification Channels

Configure in AlertManager (`observability/alertmanager.yml`):
- Email
- Slack
- PagerDuty
- Webhooks

## 🔧 Troubleshooting

### Common Issues

1. **Redis connection failed**
   - Check Redis is running: `docker ps | grep redis`
   - Verify REDIS_URL in .env
   - System falls back to in-memory rate limiting

2. **No metrics appearing**
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify metrics endpoint: `curl localhost:3000/metrics`

3. **No traces in Jaeger**
   - Check OTLP endpoint configuration
   - Verify Jaeger is running: http://localhost:16686

4. **High memory usage**
   - Check for memory leaks in `/health/deep`
   - Review heap dumps
   - Adjust Node.js memory limits

### Performance Tuning

1. **Rate Limiting**
   ```env
   # Adjust for your load
   RATE_LIMIT_PUBLIC_REQUESTS=200
   RATE_LIMIT_PUBLIC_WINDOW=300
   ```

2. **Metrics Collection**
   ```env
   # Reduce metric cardinality
   METRICS_HIGH_CARDINALITY=false
   ```

3. **Tracing Sample Rate**
   ```env
   # Sample 10% of requests
   OTEL_TRACES_SAMPLER_RATIO=0.1
   ```

## 🚀 Production Deployment

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: lectionary-api
spec:
  ports:
    - name: http
      port: 3000
    - name: metrics
      port: 9090
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lectionary-api
spec:
  template:
    spec:
      containers:
        - name: api
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          startupProbe:
            httpGet:
              path: /health/startup
              port: 3000
            failureThreshold: 30
            periodSeconds: 10
```

### Monitoring Best Practices

1. **Set up alerts for**:
   - Error rate > 1%
   - P95 latency > 1s
   - Memory usage > 80%
   - Rate limit violations

2. **Create SLOs**:
   - 99.9% availability
   - P95 latency < 500ms
   - Error rate < 0.1%

3. **Regular reviews**:
   - Weekly metrics review
   - Monthly capacity planning
   - Quarterly performance optimization

## 📚 Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

For questions or issues, please check the logs first:
```bash
# Application logs
docker logs lectio-api

# Check health
curl http://localhost:3000/health/deep | jq

# View metrics
curl http://localhost:3000/metrics
```