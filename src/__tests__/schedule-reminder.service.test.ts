import {
  ScheduleReminderService,
  REMINDER_TYPES,
} from '../services/schedule-reminder.service';
import { EmployeeRepository } from '../repositories/employee.repository';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { SettingsRepository } from '../repositories/settings.repository';
import { sendPushNotification } from '../lib/firebase';

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../lib/firebase', () => ({
  sendPushNotification: jest.fn().mockResolvedValue('messages/1'),
}));

const mockEmployeeRepository = {
  findActiveWithSchedule: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockAttendanceRepository = {
  findCheckInsForEmployees: jest.fn(),
} as unknown as jest.Mocked<AttendanceRepository>;

const mockPermissionRepository = {
  findApprovedByEmployeeAndDate: jest.fn(),
} as unknown as jest.Mocked<PermissionRepository>;

const mockNotificationRepository = {
  create: jest.fn(),
  findRemindersForEmployees: jest.fn(),
} as unknown as jest.Mocked<NotificationRepository>;

const mockSettingsRepository = {
  getOrCreate: jest.fn(),
} as unknown as jest.Mocked<SettingsRepository>;

const schedule = {
  id: 'sched-1',
  scheduleCode: 'SCH-001',
  name: 'Reguler',
  workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  checkInTime: '08:00',
  checkOutTime: '17:00',
  breakStartTime: null,
  breakEndTime: null,
  toleranceMinutes: 0,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

const employee = {
  id: 'emp-1',
  employeeId: 'EMP001',
  name: 'Budi Santoso',
  email: 'budi@gmail.com',
  password: 'hash',
  fcmToken: 'fcm-token-1',
  position: 'Developer',
  department: 'Engineering',
  status: 'Active',
  faceRegistered: true,
  scheduleId: 'sched-1',
  joinedAt: new Date('2026-08-01T00:00:00Z'),
  photos: null,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
  schedule,
};

describe('ScheduleReminderService', () => {
  let service: ScheduleReminderService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (mockSettingsRepository.getOrCreate as jest.Mock).mockResolvedValue({
      notifMissingCheckIn: true,
    });
    (mockEmployeeRepository.findActiveWithSchedule as jest.Mock).mockResolvedValue([employee]);
    (mockAttendanceRepository.findCheckInsForEmployees as jest.Mock).mockResolvedValue([]);
    (mockPermissionRepository.findApprovedByEmployeeAndDate as jest.Mock).mockResolvedValue([]);
    (mockNotificationRepository.findRemindersForEmployees as jest.Mock).mockResolvedValue([]);
    (mockNotificationRepository.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

    service = new ScheduleReminderService(
      mockEmployeeRepository,
      mockAttendanceRepository,
      mockPermissionRepository,
      mockNotificationRepository,
      mockSettingsRepository,
    );
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  describe('Reminder H-10 (10 menit sebelum jam masuk)', () => {
    it('harus mengirim notifikasi bila employee belum absen pada H-10', async () => {
      // Senin pukul 07:55 WIB = 00:55 UTC (jadwal masuk 08:00 WIB)
      jest.setSystemTime(new Date('2026-08-10T00:55:00Z'));

      await service.runOnce();

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP001',
          type: REMINDER_TYPES.EARLY,
        }),
      );
      expect(sendPushNotification).toHaveBeenCalledWith(
        'fcm-token-1',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: REMINDER_TYPES.EARLY,
          employeeId: 'EMP001',
        }),
      );
    });

    it('harus TIDAK mengirim reminder H-10 setelah jam masuk lewat', async () => {
      // Senin pukul 08:06 WIB = 01:06 UTC
      jest.setSystemTime(new Date('2026-08-10T01:06:00Z'));

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: REMINDER_TYPES.EARLY }),
      );
    });
  });

  describe('Notifikasi H+5 (lebih dari 5 menit setelah jam masuk)', () => {
    it('harus mengirim notifikasi "belum absen" bila masih belum absen setelah +5 menit', async () => {
      // Senin pukul 08:06 WIB (lebih dari 5 menit dari 08:00)
      jest.setSystemTime(new Date('2026-08-10T01:06:00Z'));

      await service.runOnce();

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP001',
          type: REMINDER_TYPES.LATE,
        }),
      );
      expect(sendPushNotification).toHaveBeenCalledWith(
        'fcm-token-1',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: REMINDER_TYPES.LATE }),
      );
    });

    it('harus TIDAK mengirim notifikasi H+5 sebelum batas waktu terpenuhi', async () => {
      // Senin pukul 08:02 WIB = 00:02 UTC (belum lewat 5 menit)
      jest.setSystemTime(new Date('2026-08-10T01:02:00Z'));

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Pengecualian', () => {
    it('harus melewatkan employee yang sudah CHECK_IN hari ini', async () => {
      jest.setSystemTime(new Date('2026-08-10T00:55:00Z'));
      (mockAttendanceRepository.findCheckInsForEmployees as jest.Mock).mockResolvedValue([
        { employeeId: 'EMP001' },
      ]);

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it('harus melewatkan employee dengan izin APPROVED hari ini', async () => {
      jest.setSystemTime(new Date('2026-08-10T00:55:00Z'));
      (mockPermissionRepository.findApprovedByEmployeeAndDate as jest.Mock).mockResolvedValue([
        { employeeId: 'EMP001' },
      ]);

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });

    it('harus melewatkan employee yang jadwalnya tidak berlaku hari itu (Minggu)', async () => {
      // Minggu 09-08-2026 pukul 07:55 WIB = 00:55 UTC
      jest.setSystemTime(new Date('2026-08-09T00:55:00Z'));

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Dedup', () => {
    it('harus tidak mengirim ulang reminder yang sudah terkirim sebelumnya', async () => {
      jest.setSystemTime(new Date('2026-08-10T00:55:00Z'));
      (mockNotificationRepository.findRemindersForEmployees as jest.Mock).mockResolvedValue([
        { employeeId: 'EMP001', type: REMINDER_TYPES.EARLY },
      ]);

      await service.runOnce();

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      expect(sendPushNotification).not.toHaveBeenCalled();
    });
  });

  describe('Setting', () => {
    it('harus berhenti bila notifMissingCheckIn dimatikan', async () => {
      jest.setSystemTime(new Date('2026-08-10T00:55:00Z'));
      (mockSettingsRepository.getOrCreate as jest.Mock).mockResolvedValue({
        notifMissingCheckIn: false,
      });

      await service.runOnce();

      expect(mockEmployeeRepository.findActiveWithSchedule).not.toHaveBeenCalled();
      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });
  });
});