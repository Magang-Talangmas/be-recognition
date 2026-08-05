import Redis from 'ioredis';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { logger } from '../config/logger';
import { sendPushNotification } from '../lib/firebase';
import {
  REDIS_ATTENDANCE_TTL,
  buildAttendanceDebounceKey,
} from '../constants/redis.constants';
import {
  AttendanceFilter,
  AttendanceWithEmployee,
  ConfirmationStatus,
  DailyAttendanceResult,
  PaginatedAttendance,
} from '../interfaces/attendance.interface';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';

export interface ProcessAttendanceInput {
  externalEventId?: string;  // event_id dari AI (UUID, opsional)
  employeeId: string;
  cameraId: string;
  eventType: string;
  similarity?: number;
  timestamp: string;         // ISO 8601 string (detected_at dari AI)
}

export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly redis: Redis,
  ) { }

  async processAttendance(data: ProcessAttendanceInput): Promise<void> {
    if (data.externalEventId) {
      const existing = await this.attendanceRepository
        .findByExternalEventId(data.externalEventId)
        .catch((err) => {
          logger.error('DB error saat idempotency check', {
            externalEventId: data.externalEventId,
            error: err instanceof Error ? err.message : 'unknown',
          });
          return null; // Jika error, tetap lanjut (jangan block proses)
        });

      if (existing) {
        logger.info('Attendance diabaikan (event_id sudah diproses — idempotent)', {
          externalEventId: data.externalEventId,
          employeeId: data.employeeId,
          eventType: data.eventType,
          existingAttendanceId: existing.id,
        });
        return;
      }
    }

    // Cek apakah employee sudah memiliki absensi event_type ini pada hari yang sama (hanya 1x per hari)
    const targetDate = new Date(data.timestamp);
    const existingToday = await this.attendanceRepository
      .findTodayAttendance(data.employeeId, data.eventType, targetDate)
      .catch((err) => {
        logger.error('DB error saat pengecekan daily attendance', {
          employeeId: data.employeeId,
          eventType: data.eventType,
          error: err instanceof Error ? err.message : 'unknown',
        });
        return null;
      });

    if (existingToday) {
      logger.info('Attendance diabaikan (employee sudah tercatat pada hari ini)', {
        employeeId: data.employeeId,
        eventType: data.eventType,
        date: data.timestamp.split('T')[0],
        existingAttendanceId: existingToday.id,
      });
      return;
    }

    const redisKey = buildAttendanceDebounceKey(data.employeeId, data.eventType);
    let cooldownExists: string | null = null;

    try {
      cooldownExists = await this.redis.get(redisKey);
    } catch (redisError) {
      logger.error('Redis error saat GET cooldown attendance', {
        redisKey,
        error: redisError instanceof Error ? redisError.message : 'unknown',
      });
    }

    if (cooldownExists !== null) {
      logger.info('Attendance diabaikan (Redis debounce aktif)', {
        redisKey,
        employeeId: data.employeeId,
        eventType: data.eventType,
      });
      return;
    }

    const employee = await this.employeeRepository.findByEmployeeId(data.employeeId);
    if (!employee) {
      logger.warn('Attendance diterima untuk employee tidak terdaftar', {
        employeeId: data.employeeId,
      });
      throw new NotFoundError(`Employee dengan ID ${data.employeeId} tidak ditemukan`);
    }

    await this.attendanceRepository.create({
      externalEventId: data.externalEventId,
      employeeId: data.employeeId,
      cameraId: data.cameraId,
      eventType: data.eventType,
      similarity: data.similarity,
      timestamp: new Date(data.timestamp),
      confirmationStatus: 'PENDING',
    });

    logger.info('Attendance berhasil disimpan (Status: PENDING)', {
      cameraId: data.cameraId,
      confirmationStatus: 'PENDING',
    });

    if (data.cameraId !== 'mobile-app' && employee.fcmToken) {
      sendPushNotification(
        employee.fcmToken,
        'Absensi Terdeteksi CCTV',
        `Sistem mendeteksi kehadiran Anda via kamera ${data.cameraId}`,
        {
          intentAction: 'com.example.javatraining.CCTV_CHECK_IN',
          employeeId: data.employeeId,
          timestamp: data.timestamp,
        }
      ).catch((err: any) => {
        logger.error('Gagal mengirim background notification ke mobile', err);
      });
    }

    try {
      await this.redis.set(redisKey, '1', 'EX', REDIS_ATTENDANCE_TTL);
    } catch (redisError) {
      logger.error('Redis error saat SET cooldown attendance', {
        redisKey,
        error: redisError instanceof Error ? redisError.message : 'unknown',
      });
    }
  }

  async updateConfirmationStatus(
    id: string,
    status: ConfirmationStatus,
  ): Promise<AttendanceWithEmployee> {
    const existing = await this.attendanceRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Attendance dengan ID ${id} tidak ditemukan`);
    }

    const updated = await this.attendanceRepository.updateConfirmationStatus(id, status);
    if (!updated) {
      throw new NotFoundError(`Attendance dengan ID ${id} tidak ditemukan`);
    }

    logger.info('Status konfirmasi attendance diperbarui', {
      attendanceId: id,
      previousStatus: existing.confirmationStatus,
      newStatus: status,
    });

    return updated;
  }

  async getAttendanceById(id: string): Promise<AttendanceWithEmployee> {
    const attendance = await this.attendanceRepository.findById(id);
    if (!attendance) {
      throw new NotFoundError(`Attendance dengan ID ${id} tidak ditemukan`);
    }
    return attendance;
  }

  async getAttendances(filter: AttendanceFilter): Promise<PaginatedAttendance> {
    return this.attendanceRepository.findMany(filter);
  }

  // Daftar harian: semua employee (aktif paling atas) dengan status hadir/absen per tanggal.
  async getDailyAttendance(dateStr?: string): Promise<DailyAttendanceResult> {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      throw new ValidationError('Parameter date tidak valid (format: YYYY-MM-DD)');
    }

    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const items = await this.attendanceRepository.findDailyAttendance(start, end);

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    const active = items.filter((i) => i.employeeStatus === 'Active');

    return {
      date: dateKey,
      items,
      total: items.length,
      activeCount: active.length,
      presentCount: active.filter((i) => i.present).length,
      absentCount: active.filter((i) => !i.present).length,
    };
  }
}
