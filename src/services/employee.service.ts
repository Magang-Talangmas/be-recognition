import { Employee } from '@prisma/client';
import { EmployeeRepository, PaginatedEmployees } from '../repositories/employee.repository';
import { CreateEmployeeInput, UpdateEmployeeInput, EmployeeFilterInput } from '../validators/employee.validator';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

export class EmployeeService {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async createEmployee(data: CreateEmployeeInput): Promise<Employee> {
    const existing = await this.employeeRepository.findByEmployeeId(data.employeeId);
    if (existing) {
      throw new ConflictError(`Employee dengan ID ${data.employeeId} sudah terdaftar`);
    }

    return this.employeeRepository.create(data);
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Employee dengan ID ${id} tidak ditemukan`);
    }
    return employee;
  }

  async getEmployees(filter: EmployeeFilterInput): Promise<PaginatedEmployees> {
    return this.employeeRepository.findMany(filter);
  }

  async updateEmployee(id: string, data: UpdateEmployeeInput): Promise<Employee> {
    await this.getEmployeeById(id); // validasi exists
    return this.employeeRepository.update(id, data);
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.getEmployeeById(id); // validasi exists
    await this.employeeRepository.softDelete(id);
  }
}
