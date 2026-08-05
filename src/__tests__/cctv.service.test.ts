import { CctvService } from '../services/cctv.service';
import { CctvRepository } from '../repositories/cctv.repository';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

const mockCctvRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByCameraId: jest.fn(),
  findByRtspUrl: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findMaxCameraIdNumber: jest.fn(),
} as unknown as jest.Mocked<CctvRepository>;

const mockCamera = {
  id: 'cms-camera-1',
  cameraId: 'CAM-04',
  name: 'Pintu Masuk',
  location: 'Lantai 1 - Lobby',
  rtspUrl: 'rtsp://192.168.1.101:554/stream',
  isOnline: true,
  enabled: true,
  createdAt: new Date('2026-08-05T00:00:00.000Z'),
  updatedAt: new Date('2026-08-05T00:00:00.000Z'),
} as any;

describe('CctvService', () => {
  let service: CctvService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CctvService(mockCctvRepository);
  });

  describe('createCctv', () => {
    const createData = {
      name: 'Pintu Masuk',
      location: 'Lantai 1 - Lobby',
      rtspUrl: 'rtsp://192.168.1.101:554/stream',
    };

    it('harus berhasil membuat CCTV dengan cameraId CAM-XX auto-generated', async () => {
      (mockCctvRepository.findByRtspUrl as jest.Mock).mockResolvedValue(null);
      (mockCctvRepository.findMaxCameraIdNumber as jest.Mock).mockResolvedValue(6);
      (mockCctvRepository.create as jest.Mock).mockResolvedValue(mockCamera);

      const result = await service.createCctv(createData);

      expect(mockCctvRepository.findByRtspUrl).toHaveBeenCalledWith(
        'rtsp://192.168.1.101:554/stream',
      );
      expect(mockCctvRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cameraId: 'CAM-07',
          name: 'Pintu Masuk',
          location: 'Lantai 1 - Lobby',
          rtspUrl: 'rtsp://192.168.1.101:554/stream',
          isOnline: true,
          enabled: true,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'cms-camera-1',
          cameraId: 'CAM-04',
          online: true,
          enabled: true,
        }),
      );
    });

    it('harus melempar ConflictError jika RTSP URL sudah terdaftar', async () => {
      (mockCctvRepository.findByRtspUrl as jest.Mock).mockResolvedValue(mockCamera);

      await expect(service.createCctv(createData)).rejects.toThrow(ConflictError);
      expect(mockCctvRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getCctvById', () => {
    it('harus mengembalikan CCTV jika ditemukan', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);

      const result = await service.getCctvById('cms-camera-1');

      expect(mockCctvRepository.findById).toHaveBeenCalledWith('cms-camera-1');
      expect(result).toEqual(expect.objectContaining({ id: 'cms-camera-1', cameraId: 'CAM-04' }));
    });

    it('harus melempar NotFoundError jika CCTV tidak ditemukan', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getCctvById('cms-tidak-ada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCctvs', () => {
    const filter = { page: 1, per_page: 10 };
    const listResult = { items: [mockCamera], total: 1 };

    it('harus mengembalikan daftar CCTV dengan bentuk list', async () => {
      (mockCctvRepository.findMany as jest.Mock).mockResolvedValue(listResult);

      const result = await service.getCctvs(filter);

      expect(mockCctvRepository.findMany).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        items: [expect.objectContaining({ id: 'cms-camera-1', online: true })],
        total: 1,
        page: 1,
        per_page: 10,
        total_pages: 1,
      });
    });
  });

  describe('updateCctv', () => {
    const updateData = { name: 'Pintu Belakang' };

    it('harus berhasil update CCTV jika ditemukan', async () => {
      const updatedCamera = { ...mockCamera, name: 'Pintu Belakang' };
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);
      (mockCctvRepository.update as jest.Mock).mockResolvedValue(updatedCamera);

      const result = await service.updateCctv('cms-camera-1', updateData);

      expect(mockCctvRepository.update).toHaveBeenCalledWith(
        'cms-camera-1',
        expect.objectContaining({ name: 'Pintu Belakang' }),
      );
      expect(result.name).toBe('Pintu Belakang');
    });

    it('harus melempar ConflictError jika RTSP URL baru dipakai CCTV lain', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);
      (mockCctvRepository.findByRtspUrl as jest.Mock).mockResolvedValue({
        ...mockCamera,
        id: 'cms-lain',
        rtspUrl: 'rtsp://192.168.1.200:554/stream',
      });

      await expect(
        service.updateCctv('cms-camera-1', { rtspUrl: 'rtsp://192.168.1.200:554/stream' }),
      ).rejects.toThrow(ConflictError);
      expect(mockCctvRepository.update).not.toHaveBeenCalled();
    });

    it('harus melempar NotFoundError jika CCTV tidak ditemukan saat update', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCctv('cms-tidak-ada', updateData),
      ).rejects.toThrow(NotFoundError);
      expect(mockCctvRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleStatus', () => {
    it('harus membalik status online', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);
      (mockCctvRepository.update as jest.Mock).mockResolvedValue({
        ...mockCamera,
        isOnline: false,
      });

      const result = await service.toggleStatus('cms-camera-1');

      expect(mockCctvRepository.update).toHaveBeenCalledWith(
        'cms-camera-1',
        expect.objectContaining({ isOnline: false }),
      );
      expect(result.online).toBe(false);
    });
  });

  describe('toggleEnabled', () => {
    it('harus membalik status enabled', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);
      (mockCctvRepository.update as jest.Mock).mockResolvedValue({
        ...mockCamera,
        enabled: false,
      });

      const result = await service.toggleEnabled('cms-camera-1');

      expect(mockCctvRepository.update).toHaveBeenCalledWith(
        'cms-camera-1',
        expect.objectContaining({ enabled: false }),
      );
      expect(result.enabled).toBe(false);
    });
  });

  describe('deleteCctv', () => {
    it('harus berhasil menghapus CCTV jika ditemukan', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(mockCamera);
      (mockCctvRepository.delete as jest.Mock).mockResolvedValue(mockCamera);

      await service.deleteCctv('cms-camera-1');

      expect(mockCctvRepository.delete).toHaveBeenCalledWith('cms-camera-1');
    });

    it('harus melempar NotFoundError jika CCTV tidak ditemukan saat delete', async () => {
      (mockCctvRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteCctv('cms-tidak-ada')).rejects.toThrow(NotFoundError);
      expect(mockCctvRepository.delete).not.toHaveBeenCalled();
    });
  });
});
