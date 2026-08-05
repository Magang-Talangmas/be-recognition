import { DashboardService } from '../services/dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';

const mockDashboardRepository = {
  getSummary: jest.fn(),
  findRecentActivities: jest.fn(),
} as unknown as jest.Mocked<DashboardRepository>;

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
      mockDashboardRepository.getSummary.mockResolvedValue(mockRawSummary);

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
      mockDashboardRepository.getSummary.mockResolvedValue({
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
    it('harus mengembalikan aktivitas terbaru dari repository (limit 20)', async () => {
      const activities = [
        {
          employeeName: 'Andi Pratama',
          time: '08:02',
          status: 'Checked In',
          camera: 'CAM-01',
        },
      ];
      mockDashboardRepository.findRecentActivities.mockResolvedValue(activities);

      const result = await service.getRecentActivity();

      expect(mockDashboardRepository.findRecentActivities).toHaveBeenCalledWith(20);
      expect(result).toEqual(activities);
    });
  });
});