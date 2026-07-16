import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Fields that must never be written to logs, even in an error dump.
const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'newPassword',
  'oldPassword',
  'apiSecret',
  'api_secret',
  'apiSecretHash',
  'api_secret_hash',
  'passwordHash',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
]);

function redactSensitive(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_BODY_KEYS.has(key)) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any)?.message || JSON.stringify(response);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `${request.method} ${request.url} -> ${status}: ${typeof message === 'string' ? message : JSON.stringify(message)}` +
        (request.body ? ` | body=${JSON.stringify(redactSensitive(request.body))}` : ''),
      stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}

