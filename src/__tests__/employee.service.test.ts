import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from '../repositories/employee.repository';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';

const mockEmployeeRepository = {
  create: jest.fn(),
  findByEmployeeId: jest.fn(),
  findByEmail: jest.fn(),
  findNextEmployeeCode: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  toggleStatus: jest.fn(),
  toggleFace: jest.fn(),
  softDelete: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockEmployee = {
  id: 'uuid-1',
  employeeId: 'EMP-001',
  name: 'Budi Santoso',
  email: 'budi@talangmas.co.id',
  department: 'Engineering',
  position: 'Developer',
  isActive: true,
  faceRegistered: true,
  joinedAt: new Date('2023-02-14'),
  photos: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeeService(mockEmployeeRepository);
  });

  describe('createEmployee', () => {
    const createData = {
      name: 'Rina Kusuma',
      email: 'rina@talangmas.co.id',
      position: 'Staff HR',
      department: 'Human Resources',
    };

    it('harus membuat employee dengan employeeId baru dan faceRegistered=false jika photos < 3', async () => {
      (mockEmployeeRepository.findNextEmployeeCode as jest.Mock).mockResolvedValue('EMP-002');
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockEmployeeRepository.create as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        employeeId: 'EMP-002',
        name: createData.name,
        email: createData.email,
        faceRegistered: false,
      });

      const result = await service.createEmployee(createData, []);

      expect(mockEmployeeRepository.findNextEmployeeCode).toHaveBeenCalled();
      expect(mockEmployeeRepository.findByEmail).toHaveBeenCalledWith(createData.email);
      expect(mockEmployeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP-002',
          email: createData.email,
          faceRegistered: false,
          photos: [],
        }),
      );
      expect(result.id).toBe('EMP-002');
      expect(result.status).toBe('Active');
      expect(result.faceRegistered).toBe(false);
    });

    it('harus set faceRegistered=true jika photos >= 3', async () => {
      (mockEmployeeRepository.findNextEmployeeCode as jest.Mock).mockResolvedValue('EMP-003');
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockEmployeeRepository.create as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        employeeId: 'EMP-003',
        faceRegistered: true,
        photos: ['/a.jpg', '/b.jpg', '/c.jpg'],
      });

      const result = await service.createEmployee(createData, ['/a.jpg', '/b.jpg', '/c.jpg']);

      expect(result.faceRegistered).toBe(true);
    });

    it('harus melempar ValidationError jika email sudah digunakan', async () => {
      (mockEmployeeRepository.findNextEmployeeCode as jest.Mock).mockResolvedValue('EMP-002');
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(mockEmployee);

      await expect(service.createEmployee(createData, [])).rejects.toThrow(ValidationError);
      expect(mockEmployeeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeeById', () => {
    it('harus mengembalikan employee jika ditemukan (by employeeId)', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById('EMP-001');

      expect(mockEmployeeRepository.findByEmployeeId).toHaveBeenCalledWith('EMP-001');
      expect(result).toEqual({
        id: 'EMP-001',
        name: 'Budi Santoso',
        email: 'budi@talangmas.co.id',
        position: 'Developer',
        department: 'Engineering',
        status: 'Active',
        faceRegistered: true,
        joinedAt: '2023-02-14',
        photos: [],
      });
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(service.getEmployeeById('EMP-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEmployees', () => {
    const filter = { page: 1, per_page: 10 };
    const paginatedResult = {
      items: [mockEmployee],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };

    it('harus mengembalikan daftar employees dengan pagination', async () => {
      (mockEmployeeRepository.findMany as jest.Mock).mockResolvedValue(paginatedResult);

      const result = await service.getEmployees(filter);

      expect(mockEmployeeRepository.findMany).toHaveBeenCalledWith(filter);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.total_pages).toBe(1);
    });
  });

  describe('updateEmployee', () => {
    const updateData = { name: 'Budi Updated' };

    it('harus berhasil update employee jika ditemukan', async () => {
      const updatedEmployee = { ...mockEmployee, name: 'Budi Updated' };
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.update as jest.Mock).mockResolvedValue(updatedEmployee);

      const result = await service.updateEmployee('EMP-001', updateData, []);

      expect(mockEmployeeRepository.findByEmployeeId).toHaveBeenCalledWith('EMP-001');
      expect(mockEmployeeRepository.update).toHaveBeenCalledWith(
        'EMP-001',
        expect.objectContaining({ name: 'Budi Updated' }),
      );
      expect(result.name).toBe('Budi Updated');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat update', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateEmployee('EMP-999', updateData, []),
      ).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });

    it('harus melempar ValidationError jika email baru sudah dipakai', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        email: 'orang-lain@test.com',
      });

      await expect(
        service.updateEmployee('EMP-001', { email: 'orang-lain@test.com' }, []),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('toggleStatus', () => {
    it('harus membalik status isActive', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.toggleStatus as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      const result = await service.toggleStatus('EMP-001');

      expect(result.status).toBe('Inactive');
    });

    it('harus melempar NotFoundError jika tidak ditemukan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(service.toggleStatus('EMP-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('toggleFace', () => {
    it('harus membalik faceRegistered', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.toggleFace as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        faceRegistered: false,
      });

      const result = await service.toggleFace('EMP-001');

      expect(result.faceRegistered).toBe(false);
    });

    it('harus melempar NotFoundError jika tidak ditemukan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(service.toggleFace('EMP-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteEmployee', () => {
    it('harus berhasil soft delete employee jika ditemukan', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.softDelete as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      await service.deleteEmployee('EMP-001');

      expect(mockEmployeeRepository.findByEmployeeId).toHaveBeenCalledWith('EMP-001');
      expect(mockEmployeeRepository.softDelete).toHaveBeenCalledWith('EMP-001');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat delete', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteEmployee('EMP-999')).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});