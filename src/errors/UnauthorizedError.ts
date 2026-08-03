import { AppError } from './AppError';
import { HTTP_STATUS } from '../constants/http.constants';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}
