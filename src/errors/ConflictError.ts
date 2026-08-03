import { AppError } from './AppError';
import { HTTP_STATUS } from '../constants/http.constants';

export class ConflictError extends AppError {
  constructor(message: string = 'Konflik data') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}
