import { DynamicModule, Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ObsLogger, OBSERVABILITY_OPTIONS } from './logger/obs-logger.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { ObservabilityOptions } from './interfaces/observability-options.interface';
import { CorrelationIdMiddleware } from './middlewares/correlation-id.middleware';
import { ObservabilityInterceptor } from './interceptors/observability.interceptor';
import { GlobalErrorFilter } from './filters/global-error.filter';

@Global()
@Module({})
export class ObservabilityModule implements NestModule {
  static forRoot(options: ObservabilityOptions): DynamicModule {
    const isMetricsEnabled = options.enableMetrics !== false;

    const providers: any[] = [
      {
        provide: OBSERVABILITY_OPTIONS,
        useValue: options,
      },
      ObsLogger,
      {
        provide: APP_FILTER,
        useClass: GlobalErrorFilter,
      },
    ];

    const controllers = [];

    if (isMetricsEnabled) {
      providers.push(MetricsService);
      controllers.push(MetricsController);
      
      if (options.globalTracking !== false) {
        providers.push({
          provide: APP_INTERCEPTOR,
          useClass: ObservabilityInterceptor,
        });
      }
    }

    return {
      module: ObservabilityModule,
      controllers,
      providers,
      exports: [ObsLogger, OBSERVABILITY_OPTIONS, ...(isMetricsEnabled ? [MetricsService] : [])],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
