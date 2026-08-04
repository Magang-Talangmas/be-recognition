import { AttendanceStatus } from '@prisma/client';
import { DashboardService } from '../services/dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';

const mockDashboardRepository = {
  countActiveEmployees: jest.fn(),
  countCameras: jest.fn(),
  findTodayStatuses: jest.fn(),
  countUnknownToday: jest.fn(),
  findRecentActivities: jest.fn(),
  findAllCameras: jest.fn(),
} as unknown as jest.Mocked<DashboardRepository>;

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(mockDashboardRepository);
  });

  describe('getSummary', () => {
    it('harus menghitung status kehadiran berdasarkan status terakhir per employee', async () => {
      mockDashboardRepository.countActiveEmployees.mockResolvedValue(128);
      mockDashboardRepository.countCameras.mockResolvedValue({ online: 14, offline: 2 });
      mockDashboardRepository.countUnknownToday.mockResolvedValue(12);
      mockDashboardRepository.findTodayStatuses.mockResolvedValue([
        { employeeId: 'e1', status: AttendanceStatus.CHECKED_IN },
        { employeeId: 'e1', status: AttendanceStatus.CHECKED_OUT },
        { employeeId: 'e2', status: AttendanceStatus.ON_BREAK },
        { employeeId: 'e3', status: AttendanceStatus.TRACKING_PAUSE },
        { employeeId: null, status: AttendanceStatus.UNKNOWN },
      ]);

      const result = await service.getSummary();

      expect(result).toEqual({
        totalEmployees: 128,
        checkedIn: 0,
        onBreak: 1,
        trackingPause: 1,
        checkedOut: 1,
        unknownFace: 12,
        cctvOnline: 14,
        cctvOffline: 2,
      });
    });

    it('harus menghitung checkedIn dari status terakhir', async () => {
      mockDashboardRepository.countActiveEmployees.mockResolvedValue(3);
      mockDashboardRepository.countCameras.mockResolvedValue({ online: 1, offline: 0 });
      mockDashboardRepository.countUnknownToday.mockResolvedValue(0);
      mockDashboardRepository.findTodayStatuses.mockResolvedValue([
        { employeeId: 'e1', status: AttendanceStatus.CHECKED_IN },
        { employeeId: 'e2', status: AttendanceStatus.ON_BREAK },
        { employeeId: 'e2', status: AttendanceStatus.CHECKED_IN },
      ]);

      const result = await service.getSummary();

      expect(result.checkedIn).toBe(2);
      expect(result.onBreak).toBe(0);
    });
  });

  describe('getRecentActivity', () => {
    it('harus mengembalikan aktivitas terbaru dari repository', async () => {
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

      expect(mockDashboardRepository.findRecentActivities).toHaveBeenCalledWith(10);
      expect(result).toEqual(activities);
    });
  });

  describe('getLiveFeed', () => {
    it('harus mengembalikan daftar kamera dari repository', async () => {
      const cameras = [
        { cameraId: 'CAM-01', cameraName: 'Pintu Masuk', location: 'Lantai 1', online: true },
      ];
      mockDashboardRepository.findAllCameras.mockResolvedValue(cameras);

      const result = await service.getLiveFeed();

      expect(result).toEqual(cameras);
    });
  });
});