import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { HTTP_STATUS } from '../constants/http.constants';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await this.notificationService.getEmployeeNotifications(
        req.user.id,
        page,
        limit,
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Daftar notifikasi berhasil diambil',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const id = req.params.id as string;
      const updated = await this.notificationService.markAsRead(id, req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notifikasi berhasil ditandai telah dibaca',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
