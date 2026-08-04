import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from '../repositories/employee.repository';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

const mockEmployeeRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
} as unknown as jest.Mocked<EmployeeRepository>;

const mockEmployee = {
  id: 'uuid-1',
  employeeId: 'EMP001',
  name: 'Budi Santoso',
  department: 'Engineering',
  position: 'Developer',
  isActive: true,
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
      employeeId: 'EMP001',
      name: 'Budi Santoso',
      department: 'Engineering',
      position: 'Developer',
    };

    it('harus berhasil membuat employee jika ID belum ada', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);
      (mockEmployeeRepository.create as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.createEmployee(createData);

      expect(mockEmployeeRepository.findByEmployeeId).toHaveBeenCalledWith('EMP001');
      expect(mockEmployeeRepository.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockEmployee);
    });

    it('harus melempar ConflictError jika employeeId sudah ada', async () => {
      (mockEmployeeRepository.findByEmployeeId as jest.Mock).mockResolvedValue(mockEmployee);

      await expect(service.createEmployee(createData)).rejects.toThrow(ConflictError);
      expect(mockEmployeeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeeById', () => {
    it('harus mengembalikan employee jika ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById('uuid-1');

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockEmployee);
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getEmployeeById('uuid-tidak-ada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEmployees', () => {
    const filter = { page: 1, limit: 20 };
    const paginatedResult = {
      data: [mockEmployee],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };

    it('harus mengembalikan daftar employees dengan pagination', async () => {
      (mockEmployeeRepository.findMany as jest.Mock).mockResolvedValue(paginatedResult);

      const result = await service.getEmployees(filter);

      expect(mockEmployeeRepository.findMany).toHaveBeenCalledWith(filter);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateEmployee', () => {
    const updateData = { name: 'Budi Updated' };

    it('harus berhasil update employee jika ditemukan', async () => {
      const updatedEmployee = { ...mockEmployee, name: 'Budi Updated' };
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.update as jest.Mock).mockResolvedValue(updatedEmployee);

      const result = await service.updateEmployee('uuid-1', updateData);

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('uuid-1');
      expect(mockEmployeeRepository.update).toHaveBeenCalledWith('uuid-1', updateData);
      expect(result.name).toBe('Budi Updated');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat update', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateEmployee('uuid-tidak-ada', updateData),
      ).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmployee', () => {
    it('harus berhasil soft delete employee jika ditemukan', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(mockEmployee);
      (mockEmployeeRepository.softDelete as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      await service.deleteEmployee('uuid-1');

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('uuid-1');
      expect(mockEmployeeRepository.softDelete).toHaveBeenCalledWith('uuid-1');
    });

    it('harus melempar NotFoundError jika employee tidak ditemukan saat delete', async () => {
      (mockEmployeeRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteEmployee('uuid-tidak-ada')).rejects.toThrow(NotFoundError);
      expect(mockEmployeeRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
