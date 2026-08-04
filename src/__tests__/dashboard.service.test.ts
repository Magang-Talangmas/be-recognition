import { DashboardService } from '../services/dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';

const mockDashboardRepository = {
  getSummary: jest.fn(),
  findRecentActivity: jest.fn(),
} as unknown as jest.Mocked<DashboardRepository>;

const mockAttendanceWithEmployee = {
  id: 'att-1',
  employeeId: 'EMP-001',
  cameraId: 'CAM-01',
  timestamp: new Date('2026-08-04T08:02:00.000Z'),
  createdAt: new Date('2026-08-04T08:02:00.000Z'),
  updatedAt: new Date('2026-08-04T08:02:00.000Z'),
  employee: {
    id: 'id-1',
    employeeId: 'EMP-001',
    name: 'Budi Santoso',
    department: 'Engineering',
    position: 'Developer',
  },
};

const mockRawSummary = {
  totalEmployees: 128,
  activeEmployees: 120,
  faceRegistered: 95,
  presentToday: 12,
  departmentCount: 5,
  recentActivity: 156,
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(mockDashboardRepository);
  });

  describe('getSummary', () => {
    it('harus mengembalikan summary flat yang benar', async () => {
      (mockDashboardRepository.getSummary as jest.Mock).mockResolvedValue(mockRawSummary);

      const result = await service.getSummary();

      expect(mockDashboardRepository.getSummary).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );

      expect(result).toEqual({
        totalEmployees: 128,
        active: 120,
        inactive: 8,
        faceRegistered: 95,
        faceNotRegistered: 33,
        presentToday: 12,
        departments: 5,
        recentActivity: 156,
      });
    });

    it('harus mengembalikan 0 saat tidak ada data', async () => {
      (mockDashboardRepository.getSummary as jest.Mock).mockResolvedValue({
        totalEmployees: 0,
        activeEmployees: 0,
        faceRegistered: 0,
        presentToday: 0,
        departmentCount: 0,
        recentActivity: 0,
      });

      const result = await service.getSummary();

      expect(result.inactive).toBe(0);
      expect(result.faceNotRegistered).toBe(0);
      expect(result.presentToday).toBe(0);
    });
  });

  describe('getRecentActivity', () => {
    it('harus memetakan attendance menjadi item aktivitas', async () => {
      (mockDashboardRepository.findRecentActivity as jest.Mock).mockResolvedValue([
        mockAttendanceWithEmployee,
      ]);

      const result = await service.getRecentActivity(20);

      expect(mockDashboardRepository.findRecentActivity).toHaveBeenCalledWith(20);
      expect(result).toEqual([
        {
          employeeName: 'Budi Santoso',
          time: expect.any(String),
          status: 'Checked In',
          camera: 'CAM-01',
        },
      ]);
      expect(result[0].status).toBe('Checked In');
    });

    it('harus memformat waktu ke HH:mm sesuai zona waktu server', async () => {
      (mockDashboardRepository.findRecentActivity as jest.Mock).mockResolvedValue([
        mockAttendanceWithEmployee,
      ]);

      const result = await service.getRecentActivity();

      expect(result[0].time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('harus mengembalikan array kosong saat tidak ada data', async () => {
      (mockDashboardRepository.findRecentActivity as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result).toEqual([]);
    });
  });
});