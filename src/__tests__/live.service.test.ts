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

export const mockAttendanceService = {
  processAttendance: jest.fn(),
} as any;

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
  findTodayRecognitionByEmployee: jest.fn(),
  findEmployeeFcmToken: jest.fn(),
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
    (mockLiveRepository.findEmployeeFcmToken as jest.Mock).mockResolvedValue(null);
    service = new LiveMonitoringService(mockLiveRepository, mockAttendanceService);
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
    beforeEach(() => {
      // Default: tidak ada duplikat di hari ini
      (mockLiveRepository.findTodayRecognitionByEmployee as jest.Mock).mockResolvedValue(null);
    });

    it('harus selalu menyimpan dengan status Unknown (bukan Verified), meski input status Verified', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 96.4,
        status: 'Verified', // Input status Verified dari ML — harus diabaikan
      });

      // Status yang disimpan ke DB harus selalu Unknown
      expect(mockLiveRepository.createRecognition).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP-001',
          cameraId: 'CAM-01',
          confidence: 96.4,
          status: 'Unknown',
        }),
      );
      // SSE publish harus 'unknown', bukan 'recognition'
      expect(liveSseHub.publish).toHaveBeenCalledWith('unknown', expect.any(Object));
      // Hasil tidak null
      expect(result).not.toBeNull();
    });

    it('harus publish event unknown saat employeeId null (wajah tidak dikenal)', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        employeeId: null,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await service.recordRecognition({
        cameraId: 'CAM-01',
        confidence: 41.3,
      });

      // Tidak ada guard untuk employeeId null
      expect(mockLiveRepository.findTodayRecognitionByEmployee).not.toHaveBeenCalled();
      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'unknown' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith('unknown', expect.any(Object));
    });

    it('harus mengembalikan null jika employee sudah tercatat hari ini dengan status Unknown', async () => {
      const existingRecord = { ...mockRecognition, status: 'Unknown' };
      (mockLiveRepository.findTodayRecognitionByEmployee as jest.Mock).mockResolvedValue(existingRecord);

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 90,
      });

      expect(result).toBeNull();
      expect(mockLiveRepository.createRecognition).not.toHaveBeenCalled();
      expect(liveSseHub.publish).not.toHaveBeenCalled();
    });

    it('harus mengembalikan null jika employee sudah tercatat hari ini dengan status Verified', async () => {
      const existingRecord = { ...mockRecognition, status: 'Verified' };
      (mockLiveRepository.findTodayRecognitionByEmployee as jest.Mock).mockResolvedValue(existingRecord);

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 90,
      });

      expect(result).toBeNull();
      expect(mockLiveRepository.createRecognition).not.toHaveBeenCalled();
    });

    it('harus mengizinkan POST ulang jika status sebelumnya Rejected (findTodayRecognitionByEmployee return null)', async () => {
      // Guard hanya cek Unknown/Verified — jika sebelumnya Rejected, query return null
      (mockLiveRepository.findTodayRecognitionByEmployee as jest.Mock).mockResolvedValue(null);
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 88,
      });

      expect(result).not.toBeNull();
      expect(mockLiveRepository.createRecognition).toHaveBeenCalled();
    });

    it('harus mencatat absensi CHECK_IN otomatis saat karyawan dikenali', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);
      (mockAttendanceService.processAttendance as jest.Mock).mockResolvedValue(true);

      await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 96.4,
        timestamp: '2026-08-06T08:02:11.000Z',
      });

      expect(mockAttendanceService.processAttendance).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP-001',
          cameraId: 'CAM-01',
          eventType: 'CHECK_IN',
          similarity: 0.964,
          timestamp: '2026-08-06T08:02:11.000Z',
        }),
      );
    });

    it('harus tidak mencatat absensi otomatis saat wajah tidak dikenal (employeeId null)', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        employeeId: null,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await service.recordRecognition({
        cameraId: 'CAM-01',
        confidence: 41.3,
      });

      expect(mockAttendanceService.processAttendance).not.toHaveBeenCalled();
    });

    it('harus tetap lanjut jika pencatatan absensi otomatis gagal', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);
      (mockLiveRepository.findEmployeeNameByEmployeeId as jest.Mock).mockResolvedValue('Andi Pratama');
      (mockLiveRepository.createRecognition as jest.Mock).mockResolvedValue({
        ...mockRecognition,
        status: 'Unknown',
      });
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);
      (mockAttendanceService.processAttendance as jest.Mock).mockRejectedValue(
        new Error('db down'),
      );

      const result = await service.recordRecognition({
        employeeId: 'EMP-001',
        cameraId: 'CAM-01',
        confidence: 90,
      });

      expect(result).not.toBeNull();
      expect(mockAttendanceService.processAttendance).toHaveBeenCalled();
    });
  });

  describe('recordCameraStatus', () => {
    it('publish camera_online + notifikasi type cctv', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);

      await service.recordCameraStatus('CAM-01', true);

      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'camera_online',
        expect.objectContaining({
          cameraId: 'CAM-01',
          name: 'Pintu Masuk',
          notificationId: 'notif-1',
        }),
      );
      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cctv',
          title: 'CCTV Kembali Online',
        }),
      );
    });

    it('publish camera_offline dengan field since', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(mockCamera);

      await service.recordCameraStatus('CAM-01', false);

      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'camera_offline',
        expect.objectContaining({ cameraId: 'CAM-01', since: expect.any(String) }),
      );
      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cctv',
          title: 'CCTV Offline',
        }),
      );
    });

    it('tidak melakukan apa-apa jika kamera tidak ditemukan', async () => {
      (mockLiveRepository.findCameraByCameraId as jest.Mock).mockResolvedValue(null);

      await service.recordCameraStatus('CAM-99', false);

      expect(liveSseHub.publish).not.toHaveBeenCalled();
      expect(mockLiveRepository.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('publishCheckin', () => {
    it('Check In: notifikasi type checkin + publish event checkin', async () => {
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await service.publishCheckin({
        employeeId: 'EMP-001',
        name: 'Andi Pratama',
        type: 'CHECK_IN',
        isLate: false,
        time: '08:01:00',
      });

      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'checkin', title: 'Check In' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'checkin',
        expect.objectContaining({ type: 'CHECK_IN', notificationId: 'notif-1' }),
      );
    });

    it('Terlambat Masuk: title Terlambat Masuk saat isLate true', async () => {
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await service.publishCheckin({
        employeeId: 'EMP-001',
        name: 'Andi Pratama',
        type: 'CHECK_IN',
        isLate: true,
        time: '09:15:00',
      });

      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Terlambat Masuk' }),
      );
    });

    it('Check Out: title Check Out untuk tipe CHECK_OUT', async () => {
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await service.publishCheckin({
        employeeId: 'EMP-001',
        name: 'Andi Pratama',
        type: 'CHECK_OUT',
        isLate: false,
        time: '17:05:00',
      });

      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'checkin', title: 'Check Out' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'checkin',
        expect.objectContaining({ type: 'CHECK_OUT' }),
      );
    });
  });

  describe('publishSystem', () => {
    it('membuat notifikasi type system + publish event system', async () => {
      const systemNotification = {
        ...mockNotification,
        id: 'notif-sys-1',
        type: 'system',
        title: 'Pembaruan Sistem',
        description: 'Versi baru 1.2.0 telah tersedia.',
      };
      (mockLiveRepository.createNotification as jest.Mock).mockResolvedValue(systemNotification);

      const result = await service.publishSystem({
        title: 'Pembaruan Sistem',
        description: 'Versi baru 1.2.0 telah tersedia.',
      });

      expect(mockLiveRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system' }),
      );
      expect(liveSseHub.publish).toHaveBeenCalledWith(
        'system',
        expect.objectContaining({ id: 'notif-sys-1', type: 'system' }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'notif-sys-1' }));
    });

    it('mengembalikan null jika penyimpanan gagal', async () => {
      (mockLiveRepository.createNotification as jest.Mock).mockRejectedValue(
        new Error('db down'),
      );

      const result = await service.publishSystem({
        title: 'Pembaruan Sistem',
        description: 'Gagal disimpan.',
      });

      expect(result).toBeNull();
      expect(liveSseHub.publish).not.toHaveBeenCalled();
    });
  });
});
