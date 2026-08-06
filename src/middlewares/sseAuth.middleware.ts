import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { JwtPayload } from '../interfaces/auth.interface';

/**
 * Autentikasi untuk koneksi SSE (GET /live/events).
 * EventSource tidak bisa mengirim header Authorization, sehingga token
 * diterima dari query string (?token=...) sebagai fallback.
 */
export const sseAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers['authorization'];
  const queryToken = typeof req.query['token'] === 'string' ? req.query['token'] : undefined;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken;

  if (!token) {
    return next(new UnauthorizedError('Token autentikasi tidak ditemukan'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Akses SSE dengan token kadaluarsa', { path: req.path });
      return next(new UnauthorizedError('Token telah kadaluarsa'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Akses SSE dengan token tidak valid', { path: req.path });
      return next(new UnauthorizedError('Token tidak valid'));
    }

    next(error);
  }
};
