export interface ObservabilityOptions {
  /**
   * Name of the service, appended to logs and metrics.
   */
  serviceName: string;
  
  /**
   * Enable or disable logging dynamically.
   * @default true
   */
  enableLogging?: boolean;

  /**
   * Enable standard Prometheus metrics endpoint & interceptors.
   * @default true
   */
  enableMetrics?: boolean;

  /**
   * Additional properties to inject into every log (like environment).
   */
  defaultLogData?: Record<string, any>;

  /**
   * Output colorful, formatted decorative logs in the console instead of JSON.
   * Ideal for local development environments.
   * @default false
   */
  prettyLogs?: boolean;

  /**
   * Automatically bind the ObservabilityInterceptor globally to all routes.
   * If false, you can selectively apply `@UseInterceptors(ObservabilityInterceptor)` manually.
   * @default true
   */
  globalTracking?: boolean;
}
