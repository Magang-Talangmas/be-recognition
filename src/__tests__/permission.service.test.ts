import { PermissionService } from '../services/permission.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';

jest.mock('../lib/storage', () => ({
  uploadPermissionPhoto: jest.fn(),
}));

import { uploadPermissionPhoto } from '../lib/storage';

const mockPermissionRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  findMany: jest.fn(),
} as unknown as jest.Mocked<PermissionRepository>;

const mockEmployeeRepository = {
  findByEmployeeId: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockPermission = {
  id: 'perm-cuid-1',
  employeeId: 'EMP-001',
  date: new Date('2026-08-06T00:00:00.000Z'),
  type: 'Sakit',
  reason: 'Sakit dengan surat dokter',
  photoUrl: 'https://supabase.co/storage/v1/object/public/bucket/permissions/EMP-001/2026-08-06.jpg',
  status: 'PENDING',
  createdAt: new Date('2026-08-06T08:00:00.000Z'),
  updatedAt: new Date('2026-08-06T08:00:00.000Z'),
} as any;

const mockFile = {
  buffer: Buffer.from('fake-image-bytes'),
  mimetype: 'image/jpeg',
} as Express.Multer.File;

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(
      mockPermissionRepository,
      mockEmployeeRepository,
    );
  });

  describe('createPermission', () => {
    it('harus upload foto + menyimpan izin berstatus PENDING untuk employee', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue({
        employeeId: 'EMP-001',
        name: 'Budi Santoso',
      });
      (uploadPermissionPhoto as jest.Mock).mockResolvedValue(mockPermission.photoUrl);
      (mockPermissionRepository.create as jest.Mock).mockResolvedValue(mockPermission);

      const result = await service.createPermission(
        {
          employeeId: 'EMP-001',
          date: '2026-08-06',
          type: 'Sakit',
          reason: 'Sakit dengan surat dokter',
        },
        mockFile,
        false,
      );

      expect(mockEmployeeRepository.findByEmployeeId).toHaveBeenCalledWith('EMP-001');
      expect(uploadPermissionPhoto).toHaveBeenCalledWith(
        mockFile,
        'EMP-001',
        '2026-08-06',
      );
      expect(mockPermissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP-001',
          date: new Date('2026-08-06T00:00:00.000Z'),
          type: 'Sakit',
          status: 'PENDING',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'perm-cuid-1',
          date: '2026-08-06',
          photoUrl: mockPermission.photoUrl,
          status: 'PENDING',
        }),
      );
    });

    it('harus langsung APPROVED jika autoApprove (admin)', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue({
        employeeId: 'EMP-001',
        name: 'Budi Santoso',
      });
      (uploadPermissionPhoto as jest.Mock).mockResolvedValue(mockPermission.photoUrl);
      (mockPermissionRepository.create as jest.Mock).mockResolvedValue({
        ...mockPermission,
        status: 'APPROVED',
      });

      const result = await service.createPermission(
        {
          employeeId: 'EMP-001',
          date: '2026-08-06',
          type: 'Izin',
          reason: 'Diajukan admin',
        },
        mockFile,
        true,
      );

      expect(mockPermissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
        }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPermission(
          {
            employeeId: 'EMP-999',
            date: '2026-08-06',
            type: 'Izin',
            reason: 'Ada keperluan',
          },
          mockFile,
        ),
      ).rejects.toThrow(NotFoundError);
      expect(uploadPermissionPhoto).not.toHaveBeenCalled();
    });

    it('harus melempar ValidationError jika file tidak disertakan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue({
        employeeId: 'EMP-001',
      });

      await expect(
        service.createPermission({
          employeeId: 'EMP-001',
          date: '2026-08-06',
          type: 'Cuti',
          reason: 'Cuti tahunan',
        }),
      ).rejects.toThrow(ValidationError);
      expect(uploadPermissionPhoto).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('harus mengubah status izin dan mengembalikan DTO', async () => {
      (mockPermissionRepository.findById as jest.Mock).mockResolvedValue(mockPermission);
      (mockPermissionRepository.updateStatus as jest.Mock).mockResolvedValue({
        ...mockPermission,
        status: 'APPROVED',
      });

      const result = await service.updateStatus('perm-cuid-1', 'APPROVED');

      expect(mockPermissionRepository.updateStatus).toHaveBeenCalledWith(
        'perm-cuid-1',
        'APPROVED',
      );
      expect(result.status).toBe('APPROVED');
    });

    it('harus melempar NotFoundError jika izin tidak ada', async () => {
      (mockPermissionRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('perm-000', 'REJECTED'),
      ).rejects.toThrow(NotFoundError);
      expect(mockPermissionRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
