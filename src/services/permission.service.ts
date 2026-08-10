import { PermissionRepository } from '../repositories/permission.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { uploadPermissionPhoto } from '../lib/storage';
import { sendPushNotification } from '../lib/firebase';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';
import { HTTP_STATUS } from '../constants/http.constants';
import { logger } from '../config/logger';
import {
  CreatePermissionInput,
  PermissionQueryInput,
} from '../validators/permission.validator';
import {
  PermissionDTO,
  PermissionList,
  toPermissionDTO,
} from '../interfaces/permission.interface';

export type PermissionNotificationType =
  | 'PERMISSION_APPROVED'
  | 'PERMISSION_REJECTED';

export class PermissionService {
  constructor(
    private readonly repository: PermissionRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly notificationRepository?: NotificationRepository,
  ) {}

  async createPermission(
    input: CreatePermissionInput,
    file?: Express.Multer.File,
    autoApprove = false,
  ): Promise<PermissionDTO> {
    if (!input.employeeId) {
      throw new ValidationError('employeeId wajib diisi');
    }

    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError(
        `Employee dengan ID ${input.employeeId} tidak ditemukan`,
      );
    }

    if (!file) {
      throw new ValidationError(
        'Validasi gagal',
        { photo: ['File bukti izin wajib diunggah'] },
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const photoUrl = await uploadPermissionPhoto(file, input.employeeId, input.date);

    const created = await this.repository.create({
      employeeId: input.employeeId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      type: input.type,
      reason: input.reason,
      photoUrl,
      status: autoApprove ? 'APPROVED' : 'PENDING',
    });

    const dto = toPermissionDTO(created);
    await this.notifyPermissionStatus(dto);
    return dto;
  }

  async updateStatus(id: string, status: string): Promise<PermissionDTO> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Izin dengan ID ${id} tidak ditemukan`);
    }

    const updated = await this.repository.updateStatus(id, status);
    const dto = toPermissionDTO(updated);
    await this.notifyPermissionStatus(dto);
    return dto;
  }

  async getPermissions(filter: PermissionQueryInput): Promise<PermissionList> {
    const { items, total } = await this.repository.findMany(filter);
    return { items: items.map(toPermissionDTO), total };
  }

  /**
   * Kirim notifikasi ke employee (in-app + push) saat izin disetujui/ditolak admin.
   * Best-effort: kegagalan notifikasi tidak menggagalkan operasi utama.
   */
  private async notifyPermissionStatus(permission: PermissionDTO): Promise<void> {
    if (!this.notificationRepository) return;

    if (permission.status !== 'APPROVED' && permission.status !== 'REJECTED') {
      return;
    }

    const notificationType =
      permission.status === 'APPROVED'
        ? 'PERMISSION_APPROVED'
        : 'PERMISSION_REJECTED';
    const title =
      permission.status === 'APPROVED' ? 'Izin Disetujui' : 'Izin Ditolak';
    const description =
      permission.status === 'APPROVED'
        ? `Pengajuan ${permission.type} tanggal ${permission.date} telah disetujui.`
        : `Pengajuan ${permission.type} tanggal ${permission.date} ditolak. Silakan hubungi admin.`;

    try {
      const employee = await this.employeeRepository.findByEmployeeId(
        permission.employeeId,
      );

      await this.notificationRepository.create({
        employeeId: permission.employeeId,
        type: notificationType,
        title,
        description,
      });

      if (employee?.fcmToken) {
        sendPushNotification(
          employee.fcmToken,
          title,
          description,
          {
            type: notificationType,
            permissionId: permission.id,
            employeeId: permission.employeeId,
          },
        ).catch((err: unknown) => {
          logger.error('Gagal mengirim push notifikasi izin', {
            permissionId: permission.id,
            error: err instanceof Error ? err.message : 'unknown',
          });
        });
      }
    } catch (err) {
      logger.error('Gagal membuat notifikasi perubahan status izin', {
        permissionId: permission.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
}
