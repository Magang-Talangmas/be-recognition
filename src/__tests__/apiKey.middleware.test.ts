import { Request, Response, NextFunction } from 'express';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';
import { UnauthorizedError } from '../errors/UnauthorizedError';

jest.mock('../config/env', () => ({
  env: {
    ML_API_KEY: 'test-api-key-12345',
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

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
  ip: '127.0.0.1',
  path: '/api/v1/attendance',
});

const mockResponse = (): Partial<Response> => ({});

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe('apiKeyMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('harus memanggil next() tanpa error jika API key valid', () => {
    const req = mockRequest({ 'x-api-key': 'test-api-key-12345' });

    apiKeyMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).not.toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika x-api-key tidak ada', () => {
    const req = mockRequest({});

    apiKeyMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika API key salah', () => {
    const req = mockRequest({ 'x-api-key': 'api-key-yang-salah' });

    apiKeyMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('harus memanggil next(UnauthorizedError) jika x-api-key kosong', () => {
    const req = mockRequest({ 'x-api-key': '' });

    apiKeyMiddleware(req as Request, mockResponse() as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
