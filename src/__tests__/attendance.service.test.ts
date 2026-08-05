import { AttendanceService, ProcessAttendanceInput } from '../services/attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';
import { REDIS_ATTENDANCE_TTL } from '../constants/redis.constants';

// Mock logger agar tidak mencetak ke console saat test
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAttendanceRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  findByExternalEventId: jest.fn(),
  findTodayAttendance: jest.fn(),
  findDailyAttendance: jest.fn(),
  updateConfirmationStatus: jest.fn(),
} as unknown as jest.Mocked<AttendanceRepository>;

const mockEmployeeRepository = {
  findByEmployeeId: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as { get: jest.Mock; set: jest.Mock };

const mockEmployee = {
  id: 'id-1',
  employeeId: 'EMP001',
  name: 'Budi Santoso',
  department: 'Engineering',
  position: 'Developer',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseAttendanceData: ProcessAttendanceInput = {
  employeeId: 'EMP001',
  cameraId: 'CAM01',
  eventType: 'CHECK_IN',
  similarity: 0.85,
  timestamp: '2026-08-04T08:00:00.000Z',
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockAttendanceRepository.findTodayAttendance as jest.Mock).mockResolvedValue(null);
    service = new AttendanceService(
      mockAttendanceRepository,
      mockEmployeeRepository,
      mockRedis as never,
    );
  });

  describe('processAttendance', () => {
    describe('Daily Attendance Check (Single event per day)', () => {
      it('harus MENGABAIKAN attendance jika employee sudah memiliki catatan absensi pada hari ini', async () => {
        const existingTodayRecord = { id: 'att-today-1', employeeId: 'EMP001', eventType: 'CHECK_IN' };
        (mockAttendanceRepository.findTodayAttendance as jest.Mock).mockResolvedValue(existingTodayRecord);

        await service.processAttendance(baseAttendanceData);

        expect(mockAttendanceRepository.findTodayAttendance).toHaveBeenCalledWith(
          'EMP001',
          'CHECK_IN',
          expect.any(Date),
        );
        expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
        expect(mockRedis.get).not.toHaveBeenCalled();
      });
    });

    describe('Idempotency Check (event_id)', () => {
      it('harus MENGABAIKAN jika event_id sudah ada di database', async () => {
        const existingRecord = { id: 'att-existing', externalEventId: 'uuid-123' };
        (mockAttendanceRepository.findByExternalEventId as jest.Mock).mockResolvedValue(existingRecord);

        await service.processAttendance({
          ...baseAttendanceData,
          externalEventId: 'uuid-123',
        });

        expect(mockAttendanceRepository.findByExternalEventId).toHaveBeenCalledWith('uuid-123');
        expect(mockRedis.get).not.toHaveBeenCalled();
        expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
      });

      it('harus MELANJUTKAN proses jika event_id belum pernah ada di database', async () => {
        (mockAttendanceRepository.findByExternalEventId as jest.Mock).mockResolvedValue(null);
        mockRedis.get.mockResolvedValue(null);
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
        mockRedis.set.mockResolvedValue('OK');

        await service.processAttendance({
          ...baseAttendanceData,
          externalEventId: 'uuid-baru',
        });

        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
      });

      it('harus MELANJUTKAN proses jika event_id tidak disertakan (tanpa idempotency check)', async () => {
        mockRedis.get.mockResolvedValue(null);
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
        mockRedis.set.mockResolvedValue('OK');

        await service.processAttendance(baseAttendanceData); // tanpa externalEventId

        expect(mockAttendanceRepository.findByExternalEventId).not.toHaveBeenCalled();
        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
      });
    });

    describe('Redis Debounce (per employee_id + event_type)', () => {
      it('harus menyimpan attendance dan set debounce jika cooldown belum aktif', async () => {
        mockRedis.get.mockResolvedValue(null);
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({ id: 'att-1' });
        mockRedis.set.mockResolvedValue('OK');

        await service.processAttendance(baseAttendanceData);

        // Key harus per employee_id + event_type (Opsi B)
        expect(mockRedis.get).toHaveBeenCalledWith('attendance:EMP001:CHECK_IN');
        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'attendance:EMP001:CHECK_IN',
          '1',
          'EX',
          REDIS_ATTENDANCE_TTL,
        );
      });

      it('harus MENGABAIKAN attendance jika debounce aktif untuk event_type yang sama', async () => {
        mockRedis.get.mockResolvedValue('1');

        await service.processAttendance(baseAttendanceData);

        expect(mockRedis.get).toHaveBeenCalledWith('attendance:EMP001:CHECK_IN');
        expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
      });

      it('harus MEMPROSES CHECK_OUT meski CHECK_IN sedang dalam debounce', async () => {
        // CHECK_IN sedang cooldown, tapi CHECK_OUT key berbeda → boleh masuk
        mockRedis.get.mockImplementation((key: string) => {
          if (key === 'attendance:EMP001:CHECK_IN') return Promise.resolve('1');
          return Promise.resolve(null); // CHECK_OUT tidak ada di cooldown
        });
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
        mockRedis.set.mockResolvedValue('OK');

        await service.processAttendance({
          ...baseAttendanceData,
          eventType: 'CHECK_OUT',
        });

        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'attendance:EMP001:CHECK_OUT',
          '1',
          'EX',
          REDIS_ATTENDANCE_TTL,
        );
      });
    });

    describe('Employee Validation', () => {
      it('harus melempar NotFoundError jika employee tidak terdaftar', async () => {
        mockRedis.get.mockResolvedValue(null);
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

        await expect(service.processAttendance(baseAttendanceData)).rejects.toThrow(NotFoundError);
        expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('Fault Tolerance', () => {
      it('harus tetap menyimpan attendance meski Redis SET gagal', async () => {
        mockRedis.get.mockResolvedValue(null);
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
        mockRedis.set.mockRejectedValue(new Error('Redis connection refused'));

        await expect(service.processAttendance(baseAttendanceData)).resolves.toBeUndefined();
        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
      });

      it('harus tetap lanjut meski Redis GET gagal (fail-open)', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis timeout'));
        (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
        (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
        mockRedis.set.mockResolvedValue('OK');

        await expect(service.processAttendance(baseAttendanceData)).resolves.toBeUndefined();
        expect(mockAttendanceRepository.create).toHaveBeenCalledTimes(1);
      });

      it('harus tidak melempar error saat attendance diabaikan karena debounce (return void)', async () => {
        mockRedis.get.mockResolvedValue('1');

        await expect(service.processAttendance(baseAttendanceData)).resolves.toBeUndefined();
      });
    });
  });

  describe('updateConfirmationStatus', () => {
    it('harus berhasil memperbarui status konfirmasi', async () => {
      const existingAttendance = {
        id: 'att-1',
        employeeId: 'EMP001',
        eventType: 'CHECK_IN',
        confirmationStatus: 'PENDING' as const,
      };
      const updatedAttendance = {
        ...existingAttendance,
        confirmationStatus: 'CONFIRMED' as const,
      };

      (mockAttendanceRepository.findById as jest.Mock).mockResolvedValue(existingAttendance);
      (mockAttendanceRepository.updateConfirmationStatus as jest.Mock).mockResolvedValue(updatedAttendance);

      const result = await service.updateConfirmationStatus('att-1', 'CONFIRMED');

      expect(mockAttendanceRepository.findById).toHaveBeenCalledWith('att-1');
      expect(mockAttendanceRepository.updateConfirmationStatus).toHaveBeenCalledWith('att-1', 'CONFIRMED');
      expect(result.confirmationStatus).toBe('CONFIRMED');
    });

    it('harus melempar NotFoundError jika ID attendance tidak ditemukan', async () => {
      (mockAttendanceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateConfirmationStatus('invalid-id', 'CONFIRMED'),
      ).rejects.toThrow(NotFoundError);
      expect(mockAttendanceRepository.updateConfirmationStatus).not.toHaveBeenCalled();
    });
  });

  describe('getDailyAttendance', () => {
    const dailyItems = [
      {
        id: 'emp-1',
        employeeId: 'EMP001',
        name: 'Budi Santoso',
        department: 'Engineering',
        position: 'Developer',
        employeeStatus: 'Active' as const,
        present: true,
        attendanceCount: 4,
        confirmationStatus: 'CONFIRMED' as const,
        checkInAt: '2026-08-05T01:00:00.000Z',
        checkOutAt: '2026-08-05T10:00:00.000Z',
      },
      {
        id: 'emp-2',
        employeeId: 'EMP002',
        name: 'Budi Test',
        department: 'Engineering',
        position: 'QA',
        employeeStatus: 'Active' as const,
        present: false,
        attendanceCount: 0,
        confirmationStatus: null,
        checkInAt: null,
        checkOutAt: null,
      },
      {
        id: 'emp-3',
        employeeId: 'EMP003',
        name: 'Siti',
        department: 'HR',
        position: 'Manager',
        employeeStatus: 'Inactive' as const,
        present: false,
        attendanceCount: 0,
        confirmationStatus: null,
        checkInAt: null,
        checkOutAt: null,
      },
    ];

    it('harus mengembalikan daftar kehadiran harian dengan statistik', async () => {
      (mockAttendanceRepository.findDailyAttendance as jest.Mock).mockResolvedValue(dailyItems);

      const result = await service.getDailyAttendance('2026-08-05');

      expect(mockAttendanceRepository.findDailyAttendance).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
      expect(result.date).toBe('2026-08-05');
      expect(result.total).toBe(3);
      expect(result.activeCount).toBe(2);
      expect(result.presentCount).toBe(1);
      expect(result.absentCount).toBe(1);
      expect(result.items).toHaveLength(3);
    });

    it('harus memakai tanggal hari ini bila parameter date tidak diberikan', async () => {
      (mockAttendanceRepository.findDailyAttendance as jest.Mock).mockResolvedValue(dailyItems);

      await service.getDailyAttendance();

      expect(mockAttendanceRepository.findDailyAttendance).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('harus melempar ValidationError untuk tanggal tidak valid', async () => {
      await expect(service.getDailyAttendance('bukan-tanggal')).rejects.toThrow(ValidationError);
      expect(mockAttendanceRepository.findDailyAttendance).not.toHaveBeenCalled();
    });
  });
});
