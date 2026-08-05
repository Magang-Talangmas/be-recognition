import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { JwtPayload, AppRole } from '../interfaces/auth.interface';

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token autentikasi tidak ditemukan'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Token autentikasi tidak valid'));
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
      logger.warn('Akses dengan token kadaluarsa', { path: req.path });
      return next(new UnauthorizedError('Token telah kadaluarsa'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Akses dengan token tidak valid', { path: req.path });
      return next(new UnauthorizedError('Token tidak valid'));
    }

    next(error);
  }
};

export const requireRole = (...roles: AppRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Belum terautentikasi'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Akses ditolak karena role tidak mencukupi', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });
      return next(new ForbiddenError('Anda tidak memiliki akses untuk sumber daya ini'));
    }

    next();
  };
};
