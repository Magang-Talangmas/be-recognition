import { AppError } from './AppError';
import { HTTP_STATUS, HttpStatus } from '../constants/http.constants';

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string,
    errors: Record<string, string[]> = {},
    statusCode: HttpStatus = HTTP_STATUS.BAD_REQUEST,
  ) {
    super(message, statusCode);
    this.errors = errors;
  }
}
