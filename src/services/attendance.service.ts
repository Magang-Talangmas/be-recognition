import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { WorkSchedule } from '@prisma/client';

dayjs.extend(utc);
dayjs.extend(timezone);

import Redis from 'ioredis';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { LiveMonitoringRepository } from '../repositories/live.repository';
import { logger } from '../config/logger';
import { sendPushNotification } from '../lib/firebase';
import { liveSseHub } from '../lib/live/sse-hub';
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
import { CheckinEventPayload } from '../interfaces/live.interface';

export interface ProcessAttendanceInput {
  externalEventId?: string;  // event_id dari AI (UUID, opsional)
  employeeId: string;
  cameraId: string;
  eventType: string;
  similarity?: number;
  timestamp: string;         // ISO 8601 string (detected_at dari AI)
  photoUrl?: string;         // URL foto bukti (mobile check-in)
}

export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly redis: Redis,
    private readonly liveMonitoringRepository?: LiveMonitoringRepository,
  ) { }

  async processAttendance(data: ProcessAttendanceInput): Promise<boolean | undefined> {
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

    const employee = await this.employeeRepository.findByEmployeeId(data.employeeId);
    if (!employee) {
      logger.warn('Attendance diterima untuk employee tidak terdaftar', {
        employeeId: data.employeeId,
      });
      throw new NotFoundError(`Employee dengan ID ${data.employeeId} tidak ditemukan`);
    }

    let isLate: boolean | undefined = undefined;

    if (data.eventType === 'CHECK_IN') {
      const targetDayjs = dayjs(targetDate).tz('Asia/Jakarta');
      const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
      const currentDay = formatter.format(targetDate);
      const dayName = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

      // Prioritas jadwal personal employee; fallback ke jadwal berdasarkan hari
      let schedule: WorkSchedule | null = null;
      if (employee.scheduleId) {
        schedule = await this.scheduleRepository.findById(employee.scheduleId).catch((err) => {
          logger.error('Error fetch personal schedule for lateness check', err);
          return null;
        });
      }
      if (!schedule) {
        schedule = await this.scheduleRepository.findByDay(dayName).catch((err) => {
          logger.error('Error fetch schedule for lateness check', err);
          return null;
        });
      }

      if (schedule) {
        const [hourStr, minStr] = schedule.checkInTime.split(':');
        const checkInHour = parseInt(hourStr, 10);
        const checkInMin = parseInt(minStr, 10);

        const limitDayjs = targetDayjs
          .hour(checkInHour)
          .minute(checkInMin)
          .add(schedule.toleranceMinutes, 'minute')
          .second(0)
          .millisecond(0);

        isLate = targetDayjs.isAfter(limitDayjs);
      } else {
        isLate = false;
      }
    }

    await this.attendanceRepository.create({
      externalEventId: data.externalEventId,
      employeeId: data.employeeId,
      cameraId: data.cameraId,
      eventType: data.eventType,
      similarity: data.similarity,
      timestamp: targetDate,
      confirmationStatus: 'PENDING',
      isLate,
      photoUrl: data.photoUrl,
    });

    logger.info('Attendance berhasil disimpan (Status: PENDING)', {
      cameraId: data.cameraId,
      confirmationStatus: 'PENDING',
    });

    if (data.eventType === 'CHECK_IN' || data.eventType === 'CHECK_OUT') {
      try {
        const time = dayjs(targetDate).tz('Asia/Jakarta').format('HH:mm:ss');
        const lateFlag = data.eventType === 'CHECK_IN' ? (isLate ?? false) : false;
        const title =
          data.eventType === 'CHECK_OUT'
            ? 'Check Out'
            : lateFlag
              ? 'Terlambat Masuk'
              : 'Check In';
        const description =
          data.eventType === 'CHECK_OUT'
            ? `${employee.name} (${data.employeeId}) check-out pukul ${time}.`
            : `${employee.name} (${data.employeeId}) check-in${lateFlag ? ' terlambat' : ''} pukul ${time}.`;

        const payload: CheckinEventPayload = {
          employeeId: data.employeeId,
          name: employee.name,
          type: data.eventType as 'CHECK_IN' | 'CHECK_OUT',
          isLate: lateFlag,
          time,
        };

        const notification = await this.liveMonitoringRepository?.createNotification({
          type: 'checkin',
          title,
          description,
        });

        liveSseHub.publish('checkin', {
          ...payload,
          notificationId: notification?.id ?? null,
        });
      } catch (err) {
        logger.error('Gagal broadcast event checkin/checkout ke live monitoring', {
          error: err instanceof Error ? err.message : 'unknown',
          employeeId: data.employeeId,
        });
      }
    }

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

    return isLate;
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
    const baseDate = dateStr ? dayjs(dateStr).tz('Asia/Jakarta') : dayjs().tz('Asia/Jakarta');
    if (!baseDate.isValid()) {
      throw new ValidationError('Parameter date tidak valid (format: YYYY-MM-DD)');
    }

    const start = baseDate.startOf('day').toDate();
    const end = baseDate.add(1, 'day').startOf('day').toDate();

    const dateKey = baseDate.format('YYYY-MM-DD');

    const items = await this.attendanceRepository.findDailyAttendance(
      start,
      end,
      dateKey,
    );

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
