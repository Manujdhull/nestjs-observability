import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ObsLogger } from '../logger/obs-logger.service';

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: ObsLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorDetails = exception instanceof HttpException ? exception.getResponse() : null;
    const stack = exception instanceof Error ? exception.stack : undefined;
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    this.logger.error(
      {
        message: `Unhandled Exception: ${message}`,
        path: request.url,
        method: request.method,
        status,
        details: errorDetails,
      },
      stack,
      'GlobalErrorFilter'
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : message,
    });
  }
}
