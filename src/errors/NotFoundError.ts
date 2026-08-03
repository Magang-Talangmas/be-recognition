import { AppError } from './AppError';
import { HTTP_STATUS } from '../constants/http.constants';

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource tidak ditemukan') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}
