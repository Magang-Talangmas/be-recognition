import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { errorHandlerMiddleware } from '../middlewares/errorHandler.middleware';
import { AppError } from '../errors/AppError';
import { ValidationError } from '../errors/ValidationError';
import { NotFoundError } from '../errors/NotFoundError';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { HTTP_STATUS } from '../constants/http.constants';

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockRequest = (): Partial<Request> => ({
  path: '/api/v1/test',
  method: 'POST',
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

describe('errorHandlerMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('harus menangani ZodError dengan status 400 dan field errors', () => {
    const zodIssues: ZodIssue[] = [
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'email tidak boleh kosong',
        path: ['email'],
      },
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'password tidak boleh kosong',
        path: ['password'],
      },
    ];
    const zodError = new ZodError(zodIssues);

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(zodError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation Error',
        errors: expect.objectContaining({
          email: ['email tidak boleh kosong'],
          password: ['password tidak boleh kosong'],
        }),
      }),
    );
  });

  it('harus menangani ValidationError custom dengan field errors', () => {
    const validationError = new ValidationError('Validasi gagal', {
      name: ['name harus string'],
    });

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(validationError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validasi gagal',
        errors: { name: ['name harus string'] },
      }),
    );
  });

  it('harus menangani AppError operasional (NotFoundError)', () => {
    const notFoundError = new NotFoundError('Employee tidak ditemukan');

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(notFoundError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Employee tidak ditemukan',
    });
  });

  it('harus menangani AppError operasional (UnauthorizedError)', () => {
    const unauthorizedError = new UnauthorizedError('Token tidak valid');

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(unauthorizedError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token tidak valid',
    });
  });

  it('harus menangani error tidak terduga dengan status 500', () => {
    const unexpectedError = new Error('Something went terribly wrong');

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(unexpectedError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error',
    });
  });

  it('harus menangani AppError non-operasional sebagai error 500', () => {
    const nonOperationalError = new AppError('Fatal', HTTP_STATUS.INTERNAL_SERVER_ERROR, false);

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(nonOperationalError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error',
    });
  });

  it('harus menangani ZodError dengan nested path', () => {
    const zodIssues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        message: 'harus berupa string',
        path: ['address', 'city'],
      },
    ];
    const zodError = new ZodError(zodIssues);

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    errorHandlerMiddleware(zodError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation Error',
        errors: expect.objectContaining({
          'address.city': ['harus berupa string'],
        }),
      }),
    );
  });
});
