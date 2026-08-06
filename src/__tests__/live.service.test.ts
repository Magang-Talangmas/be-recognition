import { LiveMonitoringService } from '../services/live.service';
import { LiveMonitoringRepository } from '../repositories/live.repository';
import { NotFoundError } from '../errors/NotFoundError';

jest.mock('../lib/live/sse-hub', () => ({
  liveSseHub: {
    subscribe: jest.fn(),
    publish: jest.fn(),
    listenerCount: 0,
  },
}));

import { liveSseHub } from '../lib/live/sse-hub';

const mockLiveRepository = {
  findFeeds: jest.fn(),
  findRecognitions: jest.fn(),
  findNotifications: jest.fn(),
  createRecognition: jest.fn(),
  createNotification: jest.fn(),
  findNotificationById: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  findCameraByCameraId: jest.fn(),
  findEmployeeNameByEmployeeId: jest.fn(),
} as unknown as jest.Mocked<LiveMonitoringRepository>;

const mockCamera = {
  id: 'cms-camera-1',
  cameraId: 'CAM-01',
  name: 'Pintu Masuk',
  location: 'Lantai 1 - Lobby',
  rtspUrl: 'rtsp://192.168.1.10:554/stream',
  isOnline: true,
  enabled: true,
  createdAt: new Date('2026-08-06T01:00:00.000Z'),
  updatedAt: new Date('2026-08-06T01:00:00.000Z'),
} as any;

const mockRecognition = {
  id: 'rec-1',
  employeeId: 'EMP-001',
  cameraId: 'CAM-01',
  confidence: 96.4,
  status: 'Verified',
  thumbnail: null,
  createdAt: new Date('2026-08-06T08:02:11.000Z'),
} as any;

const mockNotification = {
  id: 'notif-1',
  type: 'unknown',
  title: 'Wajah Tidak Dikenal',
  description: 'Wajah unknown terdeteksi di CAM-01.',
  isRead: false,
  createdAt: new Date('2026-08-06T08:02:11.000Z'),
} as any;

describe('LiveMonitoringService', () => {
  let service: LiveMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LiveMonitoringService(mockLiveRepository);
  });

  describe('getFeeds', () => {
    it('harus mengembalikan daftar feed kamera dengan id = cameraId', async () => {
      (mockLiveRepository.findFeeds as jest.Mock).mockResolvedValue([mockCamera]);

      const result = await service.getFeeds();

      expect(result).toEqual([
        expect.objectContaining({
          id: 'CAM-01',
          name: 'Pintu Masuk',
          location: 'Lantai 1 - Lobby',
          online: true,
          rtspUrl: 'rtsp://192.168.1.10:554/stream',
        }),
      ]);
    });
  });

  describe('getRecognitions', () => {
    it('harus melengkapi cameraName dan name dari employee', async () => {
      (mockLiveRepository.findRecognitions as jest.Mock).mockResolvedValue({
        items: [mockRecognition],
        total: 1,
      });
      (mockLiveRepository.findFeeds as jest.Mock).mockResolvedValue([mockCamera]);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');

      const result = await service.getRecognitions({ limit: 8 });

      expect(result).toEqual({
        items: [
          expect.objectContaining({
            id: 'rec-1',
            employeeId: 'EMP-001',
            name: 'Andi Pratama',
            cameraId: 'CAM-01',
            cameraName: 'Pintu Masuk',
            confidence: 96.4,
            status: 'Verified',
            timestamp: '2026-08-06T08:02:11.000Z',
          }),
        ],
        total: 1,
      });
    });

    it('harus mengirim employeeId null untuk Unknown', async () => {
      const unknown = { ...mockRecognition, employeeId: null, status: 'Unknown' };
      (mockLiveRepository.findRecognitions as jest.Mock).mockResolvedValue({
        items: [unknown],
        total: 1,
      });
      (mockLiveRepository.findFeeds as jest.Mock).mockResolvedValue([mockCamera]);

      const result = await service.getRecognitions({ limit: 8 });

      expect(result.items[0].employeeId).toBeNull();
      expect(result.items[0].name).toBeNull();
      expect(result.items[0].status).toBe('Unknown');
    });
  });

  describe('getNotifications', () => {
    it('harus memetakan isRead -> read dan mengirim createdAt ISO', async () => {
      (mockLiveRepository.findNotifications as jest.Mock).mockResolvedValue({
        items: [mockNotification],
        total: 1,
      });

      const result = await service.getNotifications({ limit: 20 });

      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'notif-1',
          type: 'unknown',
          read: false,
          createdAt: '2026-08-06T08:02:11.000Z',
        }),
      );
    });
  });

  describe('markRead', () => {
    it('harus menandai notifikasi sebagai dibaca jika belum dibaca', async () => {
      (mockLiveRepository.findNotificationById as jest.Mock).mockResolvedValue(mockNotification);
      (mockLiveRepository.markNotificationRead as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markRead('notif-1');

      expect(mockLiveRepository.markNotificationRead).toHaveBeenCalledWith('notif-1');
      expect(result.read).toBe(true);
    });

    it('harus melempar NotFoundError jika notifikasi tidak ditemukan', async () => {
      (mockLiveRepository.findNotificationById as jest.Mock).mockResolvedValue(null);

      await expect(service.markRead('notif-tidak-ada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('markAllRead', () => {
    it('harus mengembalikan jumlah notifikasi yang ditandai dibaca', async () => {
      (mockLiveRepository.markAllNotificationsRead as jest.Mock).mockResolvedValue(3);

      const result = await service.markAllRead();

      expect(result).toEqual({ count: 3 });
    });
  });

  describe('recordRecognition', () => {
    it('Verified: menyimpan event, notifikasi, dan publish event recognition', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue(mockRecognition);
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 96.4,
      });

      expect(mockLiveRepository.createRecognition).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP-001',
          cameraId: 'CAM-01',
          confidence: 96.4,
          status: 'Verified',
        }),
      );
      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recognition' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'recognition',
        expect.objectContaining({ status: 'Verified', cameraName: 'Pintu Masuk' }),
      );
      expect(result.status).toBe('Verified');
    });

    it('Unknown: publish event unknown saat employeeId null', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        employeeId: null,
        status: 'Unknown',
      });

      await service.recordRecognition({
        cameraId: 'CAM-01',
        confidence: 41.3,
      });

      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'unknown' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith('unknown', expect.any(Object));
    });

    it('menurunkan status Unknown jika confidence di bawah threshold', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        status: 'Unknown',
      });

      await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 30,
      });

      expect(mockLiveRepository.createRecognition).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Unknown' }),
      );
    });
  });

  describe('recordCameraStatus', () => {
    it('publish camera_online + notifikasi type cctv', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);

      await service.recordCameraStatus('CAM-01', true);

      expect(liveSseHub.publish).toHaveBeenCalledWith('camera_online', {
        cameraId: 'CAM-01',
        name: 'Pintu Masuk',
      });
      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cctv' }),
      );
    });

    it('publish camera_offline dengan field since', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);

      await service.recordCameraStatus('CAM-01', false);

      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'camera_offline',
        expect.objectContaining({ cameraId: 'CAM-01', since: expect.any(String) }),
      );
    });

    it('tidak melakukan apa-apa jika kamera tidak ditemukan', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(null);

      await service.recordCameraStatus('CAM-99', false);

      expect(liveSseHub.publish).not.toHaveBeenCalled();
      expect(mockLiveRepository.createNotification).not.toHaveBeenCalled();
    });
  });
});
