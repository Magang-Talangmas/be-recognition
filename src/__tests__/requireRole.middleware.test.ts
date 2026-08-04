import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../middlewares/auth.middleware';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { Role } from '@prisma/client';

jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-yang-cukup-panjang-minimal-32',
    NODE_ENV: 'test',
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockResponse = (): Partial<Response> => ({});
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe('requireRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('harus memanggil next() jika user memiliki role yang sesuai', () => {
    const req = {
      user: {
        id: 'user-id-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      },
      path: '/api/v1/employees',
    } as unknown as Request;

    const middleware = requireRole(Role.ADMIN);
    middleware(req, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('harus memanggil next() jika user memiliki salah satu role yang diizinkan', () => {
    const req = {
      user: {
        id: 'user-id-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      },
      path: '/api/v1/employees',
    } as unknown as Request;

    const middleware = requireRole(Role.ADMIN, Role.VIEWER);
    middleware(req, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('harus memanggil next(ForbiddenError) jika user tidak memiliki role yang sesuai', () => {
    const req = {
      user: {
        id: 'user-id-2',
        email: 'operator@test.com',
        role: Role.VIEWER,
      },
      path: '/api/v1/employees',
    } as unknown as Request;

    const middleware = requireRole(Role.ADMIN);
    middleware(req, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('harus memanggil next(UnauthorizedError) jika req.user tidak ada', () => {
    const req = {
      path: '/api/v1/employees',
    } as unknown as Request;

    const middleware = requireRole(Role.ADMIN);
    middleware(req, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
