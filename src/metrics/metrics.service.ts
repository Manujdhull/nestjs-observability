import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: client.Registry;
  
  public readonly httpRequestDurationMicroseconds: client.Histogram<"method" | "route" | "status_code">;
  public readonly httpRequestsTotal: client.Counter<"method" | "route" | "status_code">;
  public readonly httpErrorsTotal: client.Counter<"method" | "route" | "status_code" | "error_type">;

  constructor() {
    this.registry = new client.Registry();
    
    // Add default Node.js metrics
    client.collectDefaultMetrics({ register: this.registry });

    this.httpRequestDurationMicroseconds = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // seconds
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpErrorsTotal = new client.Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
    });

    this.registry.registerMetric(this.httpRequestDurationMicroseconds);
    this.registry.registerMetric(this.httpRequestsTotal);
    this.registry.registerMetric(this.httpErrorsTotal);
  }

  getRegistry(): client.Registry {
    return this.registry;
  }
}
