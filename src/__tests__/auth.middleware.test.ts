import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UnauthorizedError } from '../errors/UnauthorizedError';
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

const JWT_SECRET = 'test-jwt-secret-yang-cukup-panjang-minimal-32';

const createValidToken = (payload = {}): string => {
  return jwt.sign(
    {
      sub: 'user-id-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
      ...payload,
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
};

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
  ip: '127.0.0.1',
  path: '/api/v1/employees',
});

const mockResponse = (): Partial<Response> => ({});
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe('authMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('harus memanggil next() dan menyimpan user jika token valid', () => {
    const token = createValidToken();
    const req = mockRequest({ authorization: `Bearer ${token}` }) as Request;

    authMiddleware(req, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user?.email).toBe('admin@test.com');
    expect(req.user?.role).toBe(Role.ADMIN);
  });

  it('harus memanggil next(UnauthorizedError) jika header Authorization tidak ada', () => {
    const req = mockRequest({});

    authMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika token tidak diawali Bearer', () => {
    const token = createValidToken();
    const req = mockRequest({ authorization: `Token ${token}` });

    authMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika token tidak valid', () => {
    const req = mockRequest({ authorization: 'Bearer token-palsu-tidak-valid' });

    authMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika token sudah kadaluarsa', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-id-1', email: 'admin@test.com', role: Role.ADMIN },
      JWT_SECRET,
      { expiresIn: '-1s' }, // Langsung expired
    );
    const req = mockRequest({ authorization: `Bearer ${expiredToken}` });

    authMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
