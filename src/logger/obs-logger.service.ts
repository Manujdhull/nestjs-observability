import { Injectable, LoggerService, Inject } from '@nestjs/common';
import * as pino from 'pino';
import { RequestContext } from '../core/request-context';
import { ObservabilityOptions } from '../interfaces/observability-options.interface';

export const OBSERVABILITY_OPTIONS = 'OBSERVABILITY_OPTIONS';

@Injectable()
export class ObsLogger implements LoggerService {
  private logger: pino.Logger;
  private isEnabled: boolean = true;
  private serviceName: string;

  constructor(
    @Inject(OBSERVABILITY_OPTIONS) private options: ObservabilityOptions,
  ) {
    this.serviceName = options.serviceName || 'unknown-service';
    this.isEnabled = options.enableLogging !== false;
    
    const pinoOptions: pino.LoggerOptions = {
      level: process.env.LOG_LEVEL || 'info',
      base: {
        service: this.serviceName,
        ...(options.defaultLogData || {}),
      },
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    };

    if (options.prettyLogs) {
      this.logger = pino.pino(
        pinoOptions,
        pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,context,correlationId',
            messageFormat: '{context} \x1b[36m[{correlationId}]\x1b[0m: {message}',
          },
        })
      );
    } else {
      this.logger = pino.pino(pinoOptions);
    }
  }

  setLogging(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private buildMessage(message: any, context?: string): any {
    const correlationId = RequestContext.getCorrelationId();
    
    let baseObj: any = {};
    
    if (typeof message === 'object') {
      baseObj = { ...message };
    } else {
      baseObj = { message };
    }

    if (correlationId) {
      baseObj.correlationId = correlationId;
    }
    
    if (context) {
      baseObj.context = context;
    }

    return baseObj;
  }

  log(message: any, context?: string) {
    if (!this.isEnabled) return;
    this.logger.info(this.buildMessage(message, context));
  }

  info(message: any, context?: string) {
    this.log(message, context);
  }

  error(message: any, stack?: string, context?: string) {
    if (!this.isEnabled) return;
    const msg = this.buildMessage(message, context);
    if (stack) {
      // Wrap it in an 'err' object so pino-pretty outputs it beautifully as a trace
      msg.err = { 
        message: typeof message === 'string' ? message : (message.message || 'Error'), 
        stack: stack 
      };
    }
    this.logger.error(msg);
  }

  warn(message: any, context?: string) {
    if (!this.isEnabled) return;
    this.logger.warn(this.buildMessage(message, context));
  }

  debug?(message: any, context?: string) {
    if (!this.isEnabled) return;
    this.logger.debug(this.buildMessage(message, context));
  }

  verbose?(message: any, context?: string) {
    if (!this.isEnabled) return;
    this.logger.trace(this.buildMessage(message, context));
  }
}
