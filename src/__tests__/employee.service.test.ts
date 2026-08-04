import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from '../repositories/employee.repository';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

const mockEmployeeRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  findByEmail: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  toggleStatus: jest.fn(),
  toggleFace: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockEmployee = {
  id: 'uuid-1',
  employeeId: 'EMP-ABC123',
  name: 'Budi Santoso',
  email: 'budi@test.com',
  password: null,
  department: 'Engineering',
  position: 'Developer',
  status: 'Active',
  faceRegistered: false,
  joinedAt: new Date('2024-01-15T00:00:00.000Z'),
  photos: ['https://res.cloudinary.com/faces/1.jpg'],
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeeService(mockEmployeeRepository);
  });

  describe('createEmployee', () => {
    const createData = {
      name: 'Budi Santoso',
      email: 'budi@test.com',
      position: 'Developer',
      department: 'Engineering',
      status: 'Active' as const,
      photos: ['https://res.cloudinary.com/faces/1.jpg'],
    };

    it('harus berhasil membuat employee baru', async () => {
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockEmployeeRepository.create as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.createEmployee(createData);

      expect(mockEmployeeRepository.findByEmail).toHaveBeenCalledWith('budi@test.com');
      expect(mockEmployeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Budi Santoso',
          email: 'budi@test.com',
          department: 'Engineering',
          position: 'Developer',
          status: 'Active',
          employeeId: expect.stringMatching(/^EMP-/),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'uuid-1',
          name: 'Budi Santoso',
          email: 'budi@test.com',
          status: 'Active',
          joinedAt: '2024-01-15T00:00:00.000Z',
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('harus melempar ConflictError jika email sudah terdaftar', async () => {
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(mockEmployee);

      await expect(service.createEmployee(createData)).rejects.toThrow(ConflictError);
      expect(mockEmployeeRepository.create).not.toHaveBeenCalled();
    });

    it('harus meng-hash password dengan 12 rounds jika diberikan', async () => {
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockEmployeeRepository.create as jest.Mock).mockResolvedValue(mockEmployee);

      await service.createEmployee({ ...createData, password: 'rahasia123' });

      const createCall = (mockEmployeeRepository.create as jest.Mock).mock.calls[0][0];
      expect(createCall.password).not.toBe('rahasia123');
      expect(createCall.password.startsWith('$2')).toBe(true);
    });
  });

  describe('getEmployeeById', () => {
    it('harus mengembalikan employee jika ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById('uuid-1');

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(expect.objectContaining({ id: 'uuid-1', status: 'Active' }));
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getEmployeeById('uuid-tidak-ada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEmployees', () => {
    const filter = { page: 1, per_page: 10 };
    const listResult = { items: [mockEmployee], total: 1 };

    it('harus mengembalikan daftar employees dengan bentuk list', async () => {
      (mockEmployeeRepository.findMany as jest.Mock).mockResolvedValue(listResult);

      const result = await service.getEmployees(filter);

      expect(mockEmployeeRepository.findMany).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        items: [
          expect.objectContaining({
            id: 'uuid-1',
            status: 'Active',
            joinedAt: '2024-01-15T00:00:00.000Z',
          }),
        ],
        total: 1,
        page: 1,
        per_page: 10,
        total_pages: 1,
      });
    });
  });

  describe('updateEmployee', () => {
    const updateData = { name: 'Budi Updated' };

    it('harus berhasil update employee jika ditemukan', async () => {
      const updatedEmployee = { ...mockEmployee, name: 'Budi Updated' };
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.update as jest.Mock).mockResolvedValue(updatedEmployee);

      const result = await service.updateEmployee('uuid-1', updateData);

      expect(mockEmployeeRepository.update).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({ name: 'Budi Updated' }),
      );
      expect(result.name).toBe('Budi Updated');
    });

    it('harus melempar ConflictError jika email baru dipakai employee lain', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        email: 'lama@test.com',
      });
      (mockEmployeeRepository.findByEmail as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        id: 'uuid-lain',
        email: 'budi@test.com',
      });

      await expect(
        service.updateEmployee('uuid-1', { email: 'budi@test.com' }),
      ).rejects.toThrow(ConflictError);
      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat update', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateEmployee('uuid-tidak-ada', updateData),
      ).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleStatus', () => {
    it('harus membalik status employee', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.toggleStatus as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        status: 'Inactive',
      });

      const result = await service.toggleStatus('uuid-1');

      expect(mockEmployeeRepository.toggleStatus).toHaveBeenCalledWith('uuid-1', 'Inactive');
      expect(result.status).toBe('Inactive');
    });

    it('harus membalik Inactive menjadi Active', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        status: 'Inactive',
      });
      (mockEmployeeRepository.toggleStatus as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        status: 'Active',
      });

      const result = await service.toggleStatus('uuid-1');

      expect(mockEmployeeRepository.toggleStatus).toHaveBeenCalledWith('uuid-1', 'Active');
      expect(result.status).toBe('Active');
    });
  });

  describe('toggleFace', () => {
    it('harus membalik status wajah employee', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.toggleFace as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        faceRegistered: true,
      });

      const result = await service.toggleFace('uuid-1');

      expect(mockEmployeeRepository.toggleFace).toHaveBeenCalledWith('uuid-1', true);
      expect(result.faceRegistered).toBe(true);
    });
  });

  describe('deleteEmployee', () => {
    it('harus berhasil soft delete employee jika ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.softDelete as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        status: 'Inactive',
      });

      await service.deleteEmployee('uuid-1');

      expect(mockEmployeeRepository.softDelete).toHaveBeenCalledWith('uuid-1');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat delete', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteEmployee('uuid-tidak-ada')).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});