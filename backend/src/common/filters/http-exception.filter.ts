import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
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

    // Log the full error
    console.error('=== Exception Caught ===');
    console.error('Status:', status);
    console.error('Message:', message);
    console.error('Path:', request.url);
    console.error('Method:', request.method);
    if (exception instanceof Error) {
      console.error('Stack:', exception.stack);
    }
    if (request.body) {
      console.error('Request Body:', JSON.stringify(request.body, null, 2));
    }
    console.error('======================');

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}

