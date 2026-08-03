import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export const apiKeyMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    logger.warn('Percobaan akses tanpa API key', {
      ip: req.ip,
      path: req.path,
    });
    return next(new UnauthorizedError('API key tidak ditemukan'));
  }

  if (apiKey !== env.ML_API_KEY) {
    logger.warn('Percobaan akses dengan API key tidak valid', {
      ip: req.ip,
      path: req.path,
    });
    return next(new UnauthorizedError('API key tidak valid'));
  }

  next();
};
