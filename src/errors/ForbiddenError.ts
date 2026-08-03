import { AppError } from './AppError';
import { HTTP_STATUS } from '../constants/http.constants';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}
