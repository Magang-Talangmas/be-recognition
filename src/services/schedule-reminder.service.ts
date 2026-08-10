import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import { EmployeeRepository, EmployeeWithSchedule } from '../repositories/employee.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { SettingsRepository } from '../repositories/settings.repository';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendPushNotification } from '../lib/firebase';

const TZ = 'Asia/Jakarta';

export const REMINDER_TYPES = {
  EARLY: 'MISSING_CHECK_IN_REMINDER',
  LATE: 'MISSING_CHECK_IN_ALERT',
} as const;

export type ReminderType = (typeof REMINDER_TYPES)[keyof typeof REMINDER_TYPES];

const REMINDER_TYPES_LIST = Object.values(REMINDER_TYPES);

/**
 * Background worker yang secara berkala mengecek employee yang belum absen.
 * - H-10 menit sebelum jam masuk -> kirim notifikasi "jangan lupa absen".
 * - 5+ menit setelah jam masuk dan belum absen -> kirim notifikasi "belum absen".
 * Employee yang sudah CHECK_IN hari itu atau punya izin APPROVED dilewati.
 */
export class ScheduleReminderService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  start(): void {
    if (this.timer) return;
    const interval = env.SCHEDULE_REMINDER_INTERVAL_MS;
    this.timer = setInterval(() => {
      void this.runOnce().catch((err) => {
        logger.error('Schedule reminder gagal dijalankan', {
          error: err instanceof Error ? err.message : 'unknown',
        });
      });
    }, interval);
    logger.info(`Schedule reminder dimulai (interval ${interval}ms, early ${env.SCHEDULE_REMINDER_EARLY_MINUTES}m, late ${env.SCHEDULE_REMINDER_LATE_MINUTES}m)`);
    void this.runOnce().catch(() => undefined);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const settings = await this.settingsRepository.getOrCreate();
      if (!settings.notifMissingCheckIn) {
        return;
      }

      const now = dayjs().tz(TZ);
      const dateKey = now.format('YYYY-MM-DD');
      const startOfDayUtc = now.startOf('day').toDate();
      const endOfDayUtc = now.add(1, 'day').startOf('day').toDate();
      const dayName = this.currentDayName();

      const employees = await this.employeeRepository.findActiveWithSchedule();
      const scheduledToday = employees.filter(
        (emp) => emp.schedule && emp.schedule.workDays.includes(dayName),
      );
      if (scheduledToday.length === 0) {
        return;
      }

      const employeeIds = scheduledToday.map((emp) => emp.employeeId);

      const [checkIns, approvedPermissions, existingReminders] = await Promise.all([
        this.attendanceRepository.findCheckInsForEmployees(employeeIds, startOfDayUtc, endOfDayUtc),
        this.permissionRepository.findApprovedByEmployeeAndDate(
          employeeIds,
          new Date(`${dateKey}T00:00:00.000Z`),
        ),
        this.notificationRepository.findRemindersForEmployees(
          employeeIds,
          REMINDER_TYPES_LIST,
          startOfDayUtc,
          endOfDayUtc,
        ),
      ]);

      const checkedIn = new Set(checkIns.map((item) => item.employeeId).filter((id): id is string => Boolean(id)));
      const excused = new Set(approvedPermissions.map((item) => item.employeeId));
      const alreadySent = new Set(
        existingReminders
          .map((item) => (item.employeeId ? `${item.employeeId}:${item.type}` : ''))
          .filter(Boolean),
      );

      for (const employee of scheduledToday) {
        if (checkedIn.has(employee.employeeId) || excused.has(employee.employeeId)) {
          continue;
        }

        const schedule = employee.schedule;
        if (!schedule) continue;

        const checkInToday = this.toTimeToday(schedule.checkInTime);
        const earlyAt = checkInToday.subtract(env.SCHEDULE_REMINDER_EARLY_MINUTES, 'minute');
        const lateAt = checkInToday.add(env.SCHEDULE_REMINDER_LATE_MINUTES, 'minute');

        // H-10 menit sebelum jam masuk
        if (
          !alreadySent.has(`${employee.employeeId}:${REMINDER_TYPES.EARLY}`) &&
          now.isAfter(earlyAt) &&
          now.isBefore(checkInToday)
        ) {
          await this.notify(
            employee,
            REMINDER_TYPES.EARLY,
            'Segera Absen Masuk',
            `Jadwal masuk ${schedule.checkInTime} dalam ${env.SCHEDULE_REMINDER_EARLY_MINUTES} menit lagi. Jangan lupa absen.`,
          );
        }

        // Lebih dari 5 menit dari jam masuk dan masih belum absen
        if (
          !alreadySent.has(`${employee.employeeId}:${REMINDER_TYPES.LATE}`) &&
          !now.isBefore(lateAt)
        ) {
          await this.notify(
            employee,
            REMINDER_TYPES.LATE,
            'Anda Belum Absen',
            `Jadwal masuk pukul ${schedule.checkInTime} sudah lewat. Segera lakukan absensi.`,
          );
        }
      }
    } catch (err) {
      logger.error('Error saat menjalankan schedule reminder', {
        error: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      this.running = false;
    }
  }

  private async notify(
    employee: EmployeeWithSchedule,
    type: ReminderType,
    title: string,
    description: string,
  ): Promise<void> {
    try {
      const notification = await this.notificationRepository.create({
        employeeId: employee.employeeId,
        type,
        title,
        description,
      });
      logger.info('Notifikasi reminder absen disimpan', {
        employeeId: employee.employeeId,
        type,
        notificationId: notification.id,
      });
    } catch (err) {
      logger.error('Gagal menyimpan notifikasi reminder absen', {
        employeeId: employee.employeeId,
        type,
        error: err instanceof Error ? err.message : 'unknown',
      });
      return;
    }

    if (employee.fcmToken) {
      sendPushNotification(
        employee.fcmToken,
        title,
        description,
        { type, employeeId: employee.employeeId },
      ).catch((err: unknown) => {
        logger.error('Gagal mengirim push reminder absen', {
          employeeId: employee.employeeId,
          type,
          error: err instanceof Error ? err.message : 'unknown',
        });
      });
    }
  }

  private currentDayName(): string {
    const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long' });
    const day = formatter.format(new Date());
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  private toTimeToday(hhmm: string): dayjs.Dayjs {
    const [hour, minute] = hhmm.split(':').map((value) => parseInt(value, 10));
    return dayjs().tz(TZ).hour(hour).minute(minute).second(0).millisecond(0);
  }
}