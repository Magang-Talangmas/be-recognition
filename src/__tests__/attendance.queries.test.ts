import { AttendanceService } from '../services/attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors/NotFoundError';

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

describe('AttendanceService - getAttendanceById & getAttendances', () => {
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService(
      mockAttendanceRepository,
      mockEmployeeRepository,
      mockRedis as never,
    );
  });

  describe('getAttendanceById', () => {
    const mockAttendanceWithEmployee = {
      id: 'att-1',
      employeeId: 'EMP001',
      cameraId: 'CAM01',
      timestamp: new Date('2026-08-03T08:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: {
        id: 'uuid-1',
        employeeId: 'EMP001',
        name: 'Budi Santoso',
        department: 'Engineering',
        position: 'Developer',
      },
    };

    it('harus mengembalikan attendance jika ditemukan', async () => {
      (mockAttendanceRepository.findById as jest.Mock).mockResolvedValue(
        mockAttendanceWithEmployee,
      );

      const result = await service.getAttendanceById('att-1');

      expect(mockAttendanceRepository.findById).toHaveBeenCalledWith('att-1');
      expect(result).toEqual(mockAttendanceWithEmployee);
      expect(result.employee?.name).toBe('Budi Santoso');
    });

    it('harus melempar NotFoundError jika attendance tidak ditemukan', async () => {
      (mockAttendanceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getAttendanceById('att-not-found')).rejects.toThrow(NotFoundError);
      await expect(service.getAttendanceById('att-not-found')).rejects.toThrow(
        'Attendance dengan ID att-not-found tidak ditemukan',
      );
    });
  });

  describe('getAttendances', () => {
    const filter = {
      page: 1,
      limit: 20,
    };

    const mockPaginatedResult = {
      data: [
        {
          id: 'att-1',
          employeeId: 'EMP001',
          cameraId: 'CAM01',
          timestamp: new Date('2026-08-03T08:00:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          employee: {
            id: 'uuid-1',
            employeeId: 'EMP001',
            name: 'Budi Santoso',
            department: 'Engineering',
            position: 'Developer',
          },
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };

    it('harus mengembalikan daftar attendance dengan pagination', async () => {
      (mockAttendanceRepository.findMany as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.getAttendances(filter);

      expect(mockAttendanceRepository.findMany).toHaveBeenCalledWith(filter);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('harus mengembalikan data kosong jika tidak ada attendance', async () => {
      const emptyResult = {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      (mockAttendanceRepository.findMany as jest.Mock).mockResolvedValue(emptyResult);

      const result = await service.getAttendances(filter);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('harus meneruskan filter dengan employeeId dan tanggal', async () => {
      const filterWithDate = {
        employeeId: 'EMP001',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-03'),
        page: 1,
        limit: 10,
      };

      (mockAttendanceRepository.findMany as jest.Mock).mockResolvedValue(mockPaginatedResult);

      await service.getAttendances(filterWithDate);

      expect(mockAttendanceRepository.findMany).toHaveBeenCalledWith(filterWithDate);
    });
  });
});
