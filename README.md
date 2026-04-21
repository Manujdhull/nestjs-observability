# NestJS Observability

A complete, production-ready, drop-in observability toolkit for NestJS applications. 

This package centralizes the messy parts of maintaining microservices by providing built-in structured logging, distributed tracing, request correlations, Prometheus metrics, and global error handling all in a single configurable module.

## Features Included

- **Centralized Structured Logging (Pino)**: Highly configurable JSON logging out-of-the-box, with pretty-printing capabilities for local development.
- **Request Correlation IDs**: Automatically generates a unique `x-correlation-id` for every request and injects it into every log line and error trace.
- **Out-Of-The-Box Prometheus Metrics**: Automatic tracking of HTTP request durations, request counts, and error counts, exposed via a native `/metrics` endpoint.
- **Distributed Tracing (OpenTelemetry)**: Built-in script for initializing Node OpenTelemetry to trace requests across microservice boundaries.
- **Global Error Handling**: A centralized `GlobalErrorFilter` that catches unhandled exceptions, structures the response, and automatically logs the stack trace with your Correlation ID attached.

---

## Installation

```bash
npm install nestjs-observability
```
*(Peer Dependencies: Make sure you have `@nestjs/common`, `@nestjs/core`, and `rxjs` installed).*

---

## 1. Quick Start (Module Registration)

Import the `ObservabilityModule` into your root `AppModule` using the `.forRoot()` method. This immediately sets up the correlation ID middleware, the global error filter, the Prometheus metrics endpoints, and request interceptors.

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from 'nestjs-observability';
import { AppController } from './app.controller';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: 'my-user-service',  // Required: Labels your logs/metrics
      prettyLogs: true,                // Highly recommended for local dev
      enableMetrics: true,             // Exposes the /metrics endpoint
      globalTracking: true,            // Tracks all controllers automatically
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

---

## 2. Using the Centralized Logger

Once registered, you can inject `ObsLogger` anywhere in your application.

```typescript
import { Controller, Get } from '@nestjs/common';
import { ObsLogger } from 'nestjs-observability';

@Controller('users')
export class UsersController {
  constructor(private readonly logger: ObsLogger) {}

  @Get()
  getUsers() {
    // 1. Simple logging (Service, CorrelationID, and Context are appended automatically)
    this.logger.info('Fetching users from database', 'UsersController');

    // 2. Logging with extra arbitrary payload data
    this.logger.info({ 
      message: 'Found active users', 
      userCount: 42,
      tenantId: 't-123'
    }, 'UsersController');

    return [];
  }
}
```

### Log Formatting Behavior
- **In Production (`prettyLogs: false`)**: Logs are printed as single-line NDJSON format. Ideal for ingestion by systems like Datadog, ELK, or Grafana Loki.
- **In Development (`prettyLogs: true`)**: Logs are colorized. The main message is printed on the first line, and any extra payload data is cleanly indented underneath it.

---

## 3. Prometheus Metrics (`/metrics`)

When `enableMetrics: true` is passed into the module options, this package automatically mounts a `MetricsController`.

You can simply navigate to `http://localhost:<YOUR_PORT>/metrics` to scrape the data.

### Automated Default Tracking
Because `globalTracking: true` is enabled by default, the underlying `ObservabilityInterceptor` automatically tracks:
1. `http_requests_total`: Total number of HTTP requests.
2. `http_request_duration_seconds`: Histogram measuring route latency.
3. `http_errors_total`: Counter for requests that throw an exception.
4. Default NodeJS internal metrics (Heap size, Event loop lag, etc.)

---

## 4. OpenTelemetry Distributed Tracing

To trace requests across multiple microservices, this package exposes an `initTelemetry` function. 

**Important:** OpenTelemetry must be initialized *before* NestJS starts. Place it at the very top of your `main.ts` entry point:

```typescript
import { initTelemetry } from 'nestjs-observability';

// 1. Initialize tracing FIRST
initTelemetry({
  serviceName: 'my-user-service',
  // You can pass a custom exporter here (e.g. OTLPTraceExporter for Jaeger)
});

// 2. Start NestJS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

---

## 5. Configuration Options Breakdown

Below are the options available when calling `ObservabilityModule.forRoot(options)`:

| Property | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `serviceName` | `string` | **Required** | The name of your microservice. Injected into every log entry and telemetry metric tag. |
| `enableLogging` | `boolean` | `true` | Allows you to completely disable standard logging outputs. |
| `enableMetrics` | `boolean` | `true` | Enables the `/metrics` endpoint and automated Prometheus interceptors. |
| `globalTracking` | `boolean` | `true` | Automatically binds the `ObservabilityInterceptor` to all controllers to track durations and counts. If `false`, you must apply `@UseInterceptors(ObservabilityInterceptor)` manually. |
| `prettyLogs` | `boolean` | `false` | When `true`, colorizes console output and pretty-prints JSON payloads on multiple lines. *Keep false in production.* |
| `defaultLogData` | `Record<string, any>` | `{}` | Hardcoded metadata injected into every log entry (e.g., `{ environment: 'staging' }`). |

---

## 6. Accessing the Correlation ID Manually

If you need the active correlation ID (e.g., to pass it into an external HTTP request), you can access it anywhere using the `RequestContext` async local storage construct:

```typescript
import { RequestContext } from 'nestjs-observability';

// Retrieve the correlation ID of the current execution context
const traceId = RequestContext.getCorrelationId();
console.log(traceId);
```