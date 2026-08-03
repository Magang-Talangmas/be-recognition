import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { ValidationError } from '../errors/ValidationError';
import { logger } from '../config/logger';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Zod validation error
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    err.errors.forEach((zodErr) => {
      const field = zodErr.path.join('.');
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(zodErr.message);
    });

    logger.warn('Validasi request gagal', {
      path: req.path,
      method: req.method,
      errors: fieldErrors,
    });

    const response: ApiErrorResponse = {
      success: false,
      message: 'Validation Error',
      errors: fieldErrors,
    };

    res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    return;
  }

  // ValidationError custom
  if (err instanceof ValidationError) {
    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      message: err.message,
    });

    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
      errors: err.errors,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // AppError operasional
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      message: err.message,
    });

    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Error tidak terduga (sistem)
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  const response: ApiErrorResponse = {
    success: false,
    message: 'Internal Server Error',
  };

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};
