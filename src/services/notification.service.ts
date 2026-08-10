import { NotificationRepository } from '../repositories/notification.repository';
import { NotFoundError } from '../errors/NotFoundError';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getEmployeeNotifications(employeeId: string, page: number = 1, limit: number = 10) {
    const result = await this.notificationRepository.findByEmployeeId(employeeId, page, limit);
    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async markAsRead(id: string, employeeId: string) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new NotFoundError('Notifikasi tidak ditemukan');
    }

    const ownerEmployeeId = notification.employeeId ?? notification.attendance?.employeeId ?? null;
    if (ownerEmployeeId && ownerEmployeeId !== employeeId) {
      throw new UnauthorizedError('Akses ditolak ke notifikasi ini');
    }

    return this.notificationRepository.markAsRead(id);
  }
}
