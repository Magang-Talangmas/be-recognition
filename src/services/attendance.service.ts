import Redis from 'ioredis';
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

  /**
   * Proses attendance dari ML server.
   *
   * Flow (sesuai Golden Rule di prompt.md):
   * 1. Cek Redis → jika ada cooldown, abaikan (return tanpa error)
   * 2. Jika tidak ada cooldown → simpan ke DB
   * 3. Simpan cooldown ke Redis (TTL 900 detik)
   */
  async processAttendance(data: {
    employeeId: string;
    cameraId: string;
    timestamp: string;
  }): Promise<void> {
    const redisKey = this.buildRedisKey(data.employeeId);

    // Step 1: Cek Redis cooldown
    let cooldownExists: string | null = null;
    try {
      cooldownExists = await this.redis.get(redisKey);
    } catch (redisError) {
      logger.error('Redis error saat GET cooldown attendance', {
        employeeId: data.employeeId,
        error: redisError instanceof Error ? redisError.message : 'unknown',
      });
      // Jika Redis error, tetap lanjutkan agar sistem tidak down total
    }

    // Step 2: Jika cooldown aktif → abaikan
    if (cooldownExists !== null) {
      logger.info('Attendance diabaikan (cooldown Redis aktif)', {
        employeeId: data.employeeId,
        cameraId: data.cameraId,
      });
      return;
    }

    // Step 3: Verifikasi employee ada di database
    const employee = await this.employeeRepository.findByEmployeeId(data.employeeId);
    if (!employee) {
      logger.warn('Attendance diterima untuk employee tidak terdaftar', {
        employeeId: data.employeeId,
      });
      throw new NotFoundError(`Employee dengan ID ${data.employeeId} tidak ditemukan`);
    }

    // Step 4: Simpan ke database
    await this.attendanceRepository.create({
      employeeId: data.employeeId,
      cameraId: data.cameraId,
      timestamp: new Date(data.timestamp),
    });

    logger.info('Attendance berhasil disimpan', {
      employeeId: data.employeeId,
      cameraId: data.cameraId,
      timestamp: data.timestamp,
    });

    // Step 5: Set Redis cooldown
    try {
      await this.redis.set(redisKey, '1', 'EX', REDIS_ATTENDANCE_TTL);
    } catch (redisError) {
      logger.error('Redis error saat SET cooldown attendance', {
        employeeId: data.employeeId,
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
