import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import * as api from '@opentelemetry/api';

export class TelemetryService {
  private sdk: NodeSDK | null = null;
  private static instance: TelemetryService;

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  public async initialize(): Promise<void> {
    const serviceName = process.env.SERVICE_NAME || 'lectionary-api';
    const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    // Configure resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: serviceVersion,
        'service.environment': environment,
        'service.namespace': 'lectionary',
        'deployment.environment': environment,
      })
    );

    // Configure trace exporter (OTLP)
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
        JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
    });

    // Configure metrics exporters
    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
        JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
    });

    // Prometheus exporter for metrics scraping
    const prometheusExporter = new PrometheusExporter({
      port: parseInt(process.env.METRICS_PORT || '9090'),
      endpoint: '/metrics',
    }, () => {
      console.log(`🎯 Prometheus metrics exposed at http://localhost:${process.env.METRICS_PORT || '9090'}/metrics`);
    });

    // Configure SDK with instrumentations
    this.sdk = new NodeSDK({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000, // Export metrics every 10 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
          '@opentelemetry/instrumentation-net': {
            enabled: true,
          },
        }),
        new ExpressInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body': JSON.stringify(request.body),
              'http.request.query': JSON.stringify(request.query),
              'http.request.params': JSON.stringify(request.params),
              'client.ip': request.ip || request.connection.remoteAddress,
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.status_code': response.statusCode,
            });
          },
        }),
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.method': request.method || '',
              'http.request.url': request.url || '',
            });
          },
          responseHook: (span, response) => {
            if (response instanceof Error) {
              span.recordException(response);
              span.setStatus({ code: api.SpanStatusCode.ERROR });
            }
          },
        }),
      ],
    });

    // Start the SDK
    await this.sdk.start();
    console.log('🔭 OpenTelemetry initialized successfully');

    // Register global tracer
    api.trace.setGlobalTracerProvider(api.trace.getTracerProvider());
  }

  public async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('🔭 OpenTelemetry shut down successfully');
    }
  }

  public getTracer(name: string = 'lectionary-api'): api.Tracer {
    return api.trace.getTracer(name);
  }

  public getMeter(name: string = 'lectionary-api'): api.Meter {
    return api.metrics.getMeter(name);
  }

  // Helper method to create custom spans
  public createSpan(
    name: string,
    attributes?: api.Attributes,
    spanKind: api.SpanKind = api.SpanKind.INTERNAL
  ): api.Span {
    const tracer = this.getTracer();
    const span = tracer.startSpan(name, {
      kind: spanKind,
      attributes,
    });
    return span;
  }

  // Helper method to record exceptions
  public recordException(span: api.Span, error: Error): void {
    span.recordException(error);
    span.setStatus({
      code: api.SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

// Export singleton instance
export const telemetry = TelemetryService.getInstance();