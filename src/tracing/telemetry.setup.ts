import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

export interface TelemetryConfig {
  serviceName: string;
  exporter?: any; // e.g. OTLPTraceExporter
  instrumentations?: any[];
}

let sdk: NodeSDK | null = null;

export const initTelemetry = (config: TelemetryConfig) => {
  if (sdk) {
    console.warn('OpenTelemetry SDK already initialized');
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
    }),
    traceExporter: config.exporter || new ConsoleSpanExporter(),
    instrumentations: config.instrumentations || [],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
};
