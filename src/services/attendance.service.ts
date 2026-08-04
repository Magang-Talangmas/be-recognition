import Redis from 'ioredis';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { logger } from '../config/logger';
import { REDIS_ATTENDANCE_TTL, REDIS_PREFIX } from '../constants/redis.constants';
import { AttendanceFilter, AttendanceWithEmployee, PaginatedAttendance } from '../interfaces/attendance.interface';
import { NotFoundError } from '../errors/NotFoundError';

export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly redis: Redis,
  ) {}

  private buildRedisKey(employeeId: string): string {
    return `${REDIS_PREFIX.ATTENDANCE}:${employeeId}`;
  }

  private buildUnknownRedisKey(cameraId: string): string {
    return `${REDIS_PREFIX.ATTENDANCE}:unknown:${cameraId}`;
  }

  async processAttendance(data: {
    employeeId?: string;
    cameraId: string;
    status?: AttendanceStatus;
    timestamp: string;
  }): Promise<void> {
    const employeeId = data.employeeId;
    const status =
      data.status ?? (employeeId ? AttendanceStatus.CHECKED_IN : AttendanceStatus.UNKNOWN);
    const redisKey = employeeId
      ? this.buildRedisKey(employeeId)
      : this.buildUnknownRedisKey(data.cameraId);

    // Step 1: Cek Redis cooldown
    let cooldownExists: string | null = null;
    try {
      cooldownExists = await this.redis.get(redisKey);
    } catch (redisError) {
      logger.error('Redis error saat GET cooldown attendance', {
        employeeId,
        error: redisError instanceof Error ? redisError.message : 'unknown',
      });
      // Jika Redis error, tetap lanjutkan agar sistem tidak down total
    }

    // Step 2: Jika cooldown aktif → abaikan
    if (cooldownExists !== null) {
      logger.info('Attendance diabaikan (cooldown Redis aktif)', {
        employeeId,
        cameraId: data.cameraId,
      });
      return;
    }

    // Step 3: Verifikasi employee ada di database (hanya untuk wajah dikenal)
    if (employeeId) {
      const employee = await this.employeeRepository.findByEmployeeId(employeeId);
      if (!employee) {
        logger.warn('Attendance diterima untuk employee tidak terdaftar', {
          employeeId,
        });
        throw new NotFoundError(`Employee dengan ID ${employeeId} tidak ditemukan`);
      }
    }

    // Step 4: Simpan ke database
    await this.attendanceRepository.create({
      employeeId: employeeId ?? null,
      cameraId: data.cameraId,
      status,
      timestamp: new Date(data.timestamp),
    });

    logger.info('Attendance berhasil disimpan', {
      employeeId,
      cameraId: data.cameraId,
      status,
      timestamp: data.timestamp,
    });

    // Step 5: Set Redis cooldown
    try {
      await this.redis.set(redisKey, '1', 'EX', REDIS_ATTENDANCE_TTL);
    } catch (redisError) {
      logger.error('Redis error saat SET cooldown attendance', {
        employeeId,
        error: redisError instanceof Error ? redisError.message : 'unknown',
      });
      // Data sudah tersimpan ke DB, log error Redis tapi tidak throw
    }
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
}
