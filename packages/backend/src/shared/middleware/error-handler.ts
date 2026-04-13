import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { ApiErrorResponse } from '../types/api-response';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.ctx?.requestId || 'unknown';

  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      error_code: err.errorCode,
      message: err.message,
      details: err.details,
      correlation_id: correlationId,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Prisma known request errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      const body: ApiErrorResponse = {
        error_code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with this value already exists',
        details: { fields: prismaErr.meta?.target },
        correlation_id: correlationId,
      };
      res.status(409).json(body);
      return;
    }
    if (prismaErr.code === 'P2025') {
      const body: ApiErrorResponse = {
        error_code: 'RECORD_NOT_FOUND',
        message: 'Record not found',
        correlation_id: correlationId,
      };
      res.status(404).json(body);
      return;
    }
  }

  console.error(`[${correlationId}] Unhandled error:`, err);

  const isDev = process.env.NODE_ENV === 'development';
  const body: ApiErrorResponse = {
    error_code: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'An unexpected error occurred',
    details: isDev ? { stack: err.stack, name: err.name } : undefined,
    correlation_id: correlationId,
  };
  res.status(500).json(body);
}
