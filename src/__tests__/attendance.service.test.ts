import { AttendanceService } from '../services/attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors/NotFoundError';
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

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService(
      mockAttendanceRepository,
      mockEmployeeRepository,
      mockRedis as never,
    );
  });

  describe('processAttendance', () => {
    const attendanceData = {
      employeeId: 'EMP001',
      cameraId: 'CAM01',
      timestamp: '2026-08-03T08:00:00.000Z',
    };

    it('harus menyimpan attendance jika Redis key belum ada', async () => {
      mockRedis.get.mockResolvedValue(null);
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({
        id: 'att-1',
        ...attendanceData,
        timestamp: new Date(attendanceData.timestamp),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRedis.set.mockResolvedValue('OK');

      await service.processAttendance(attendanceData);

      expect(mockRedis.get).toHaveBeenCalledWith('attendance:EMP001');
      expect(mockAttendanceRepository.create).toHaveBeenCalledWith({
        employeeId: 'EMP001',
        cameraId: 'CAM01',
        status: 'CHECKED_IN',
        timestamp: new Date(attendanceData.timestamp),
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'attendance:EMP001',
        '1',
        'EX',
        REDIS_ATTENDANCE_TTL,
      );
    });

    it('harus MENGABAIKAN attendance jika Redis key sudah ada (cooldown aktif)', async () => {
      mockRedis.get.mockResolvedValue('1');

      await service.processAttendance(attendanceData);

      expect(mockRedis.get).toHaveBeenCalledWith('attendance:EMP001');
      expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('harus TIDAK melempar error saat attendance diabaikan (return void)', async () => {
      mockRedis.get.mockResolvedValue('1');

      await expect(service.processAttendance(attendanceData)).resolves.toBeUndefined();
    });

    it('harus melempar NotFoundError jika employee tidak terdaftar', async () => {
      mockRedis.get.mockResolvedValue(null);
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(service.processAttendance(attendanceData)).rejects.toThrow(NotFoundError);
      expect(mockAttendanceRepository.create).not.toHaveBeenCalled();
    });

    it('harus tetap menyimpan attendance meski Redis SET gagal', async () => {
      mockRedis.get.mockResolvedValue(null);
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
      mockRedis.set.mockRejectedValue(new Error('Redis connection refused'));

      // Tidak melempar error meski Redis SET gagal
      await expect(service.processAttendance(attendanceData)).resolves.toBeUndefined();
    });

    it('harus tetap lanjut meski Redis GET gagal', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis timeout'));
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockAttendanceRepository.create as jest.Mock).mockResolvedValue({});
      mockRedis.set.mockResolvedValue('OK');

      // Sistem tidak crash meski Redis GET error
      await expect(service.processAttendance(attendanceData)).resolves.toBeUndefined();
    });
  });
});
