import { Employee } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { EmployeeRepository } from '../repositories/employee.repository';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilterInput,
} from '../validators/employee.validator';
import {
  EmployeeResponseItem,
  PaginatedEmployeeResponse,
} from '../interfaces/employee.interface';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';

const BCRYPT_SALT_ROUNDS = 12;

export class EmployeeService {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async createEmployee(
    data: CreateEmployeeInput,
    photoUrls: string[],
  ): Promise<EmployeeResponseItem> {
    const employeeId = await this.employeeRepository.findNextEmployeeCode();

    if (await this.emailExists(data.email)) {
      throw new ValidationError('Email sudah digunakan');
    }

    const created = await this.employeeRepository.create({
      name: data.name,
      email: data.email,
      position: data.position,
      department: data.department,
      isActive: (data.status ?? 'Active') === 'Active',
      password: data.password ? await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS) : undefined,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
      photos: photoUrls,
      faceRegistered: photoUrls.length >= 3,
      employeeId,
    });

    return this.toResponse(created);
  }

  async getEmployeeById(id: string): Promise<EmployeeResponseItem> {
    const employee = await this.employeeRepository.findByEmployeeId(id);
    if (!employee) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }
    return this.toResponse(employee);
  }

  async getEmployees(filter: EmployeeFilterInput): Promise<PaginatedEmployeeResponse> {
    const result = await this.employeeRepository.findMany(filter);
    return {
      items: result.items.map((emp) => this.toResponse(emp)),
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      total_pages: result.total_pages,
    };
  }

  async updateEmployee(
    id: string,
    data: UpdateEmployeeInput,
    photoUrls: string[],
  ): Promise<EmployeeResponseItem> {
    const existing = await this.employeeRepository.findByEmployeeId(id);
    if (!existing) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }

    if (data.email && data.email !== existing.email) {
      if (await this.emailExists(data.email)) {
        throw new ValidationError('Email sudah digunakan');
      }
    }

    const updated = await this.employeeRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.status !== undefined && { isActive: data.status === 'Active' }),
      ...(data.password !== undefined && {
        password: await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS),
      }),
      ...(data.joinedAt !== undefined && {
        joinedAt: data.joinedAt ? new Date(data.joinedAt) : null,
      }),
      ...(photoUrls.length > 0
        ? { photos: photoUrls, faceRegistered: photoUrls.length >= 3 }
        : {}),
    });

    return this.toResponse(updated);
  }

  async toggleStatus(id: string): Promise<EmployeeResponseItem> {
    const employee = await this.employeeRepository.findByEmployeeId(id);
    if (!employee) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }
    const updated = await this.employeeRepository.toggleStatus(id);
    return this.toResponse(updated);
  }

  async toggleFace(id: string): Promise<EmployeeResponseItem> {
    const employee = await this.employeeRepository.findByEmployeeId(id);
    if (!employee) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }
    const updated = await this.employeeRepository.toggleFace(id);
    return this.toResponse(updated);
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await this.employeeRepository.findByEmployeeId(id);
    if (!employee) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }
    await this.employeeRepository.softDelete(id);
  }

  private async emailExists(email: string): Promise<boolean> {
    const existing = await this.employeeRepository.findByEmail(email);
    return Boolean(existing);
  }

  private toResponse(employee: Employee): EmployeeResponseItem {
    return {
      id: employee.employeeId,
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      status: employee.isActive ? 'Active' : 'Inactive',
      faceRegistered: employee.faceRegistered,
      joinedAt: employee.joinedAt ? formatDate(employee.joinedAt) : null,
      photos: employee.photos,
    };
  }
}

function formatDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}