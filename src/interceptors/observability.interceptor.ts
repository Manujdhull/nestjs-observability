import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ObsLogger } from '../logger/obs-logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: ObsLogger,
    private readonly metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    const method = req.method;
    const url = req.url;
    // We typically use req.route?.path but req.url is a fallback
    const route = req.route ? req.route.path : url;
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const start = Date.now();
    const timerEnd = this.metricsService.httpRequestDurationMicroseconds.startTimer({
      method,
      route,
    });

    this.logger.info(`Incoming Request: ${method} ${url}`, `${className}.${handlerName}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode || 200;
          this.recordMetrics(method, route, statusCode, timerEnd);
          const duration = Date.now() - start;
          this.logger.info(`Outgoing Response: ${method} ${url} ${statusCode} - ${duration}ms`, `${className}.${handlerName}`);
        },
        error: (error) => {
          // Status code will be handled by Exception Filter, we might guess 500 here if undefined
          const statusCode = error.status || error.statusCode || 500;
          this.recordMetrics(method, route, statusCode, timerEnd);
          this.metricsService.httpErrorsTotal.inc({
            method,
            route,
            status_code: statusCode.toString(),
            error_type: error.name || 'UnknownError',
          });
          const duration = Date.now() - start;
          // Note: Error is logged by the GlobalErrorFilter to avoid duplicates, or we can log here.
          // We will let the filter log the actual stack trace.
          this.logger.warn(`Request Failed: ${method} ${url} ${statusCode} - ${duration}ms`, `${className}.${handlerName}`);
        },
      }),
    );
  }

  private recordMetrics(method: string, route: string, statusCode: number, timerEnd: (labels?: Partial<Record<"method" | "route" | "status_code", string | number>>) => number) {
    this.metricsService.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
    timerEnd({ status_code: statusCode.toString() });
  }
}
