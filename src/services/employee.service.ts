import bcrypt from 'bcryptjs';
import { Employee } from '@prisma/client';
import { logger } from '../config/logger';
import { EmployeeRepository, EmployeeListRows } from '../repositories/employee.repository';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilterInput,
} from '../validators/employee.validator';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { MAX_PHOTOS } from '../lib/upload/upload';
import { deleteEmployeePhotoFiles } from '../lib/storage';
import { MlRegisterService } from './ml-register.service';

export interface EmployeeDTO {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  status: 'Active' | 'Inactive';
  faceRegistered: boolean;
  joinedAt: string | null;
  photos: string[];
}

export interface EmployeeListResult {
  items: EmployeeDTO[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

type CreatePayload = CreateEmployeeInput & { photos: string[] };
type UpdatePayload = UpdateEmployeeInput & { photos?: string[] };

function toDTO(employee: Employee): EmployeeDTO {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.email,
    position: employee.position,
    department: employee.department,
    status: employee.status === 'Inactive' ? 'Inactive' : 'Active',
    faceRegistered: employee.faceRegistered,
    joinedAt: employee.joinedAt ? employee.joinedAt.toISOString() : null,
    photos: Array.isArray(employee.photos)
      ? (employee.photos as string[])
      : [],
  };
}

function generateEmployeeId(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EMP-${suffix}`;
}

export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly mlRegister?: MlRegisterService,
  ) {}

  async createEmployee(data: CreatePayload): Promise<EmployeeDTO> {
    if (data.email) {
      const existingEmail = await this.employeeRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new ConflictError(`Email ${data.email} sudah terdaftar`);
      }
    }

    const employee = await this.employeeRepository.create({
      employeeId: generateEmployeeId(),
      name: data.name,
      email: data.email,
      password: data.password ? await bcrypt.hash(data.password, 12) : undefined,
      position: data.position,
      department: data.department,
      status: data.status ?? 'Active',
      joinedAt: data.joinedAt,
      faceRegistered: data.photos.length >= MAX_PHOTOS,
      photos: data.photos,
    });

    this.syncToMl(employee);

    return toDTO(employee);
  }

  async getEmployeeById(id: string): Promise<EmployeeDTO> {
    const employee = await this.findByUuidOrEmployeeId(id);
    return toDTO(employee);
  }

  async getEmployees(filter: EmployeeFilterInput): Promise<EmployeeListResult> {
    const result: EmployeeListRows = await this.employeeRepository.findMany(filter);

    return {
      items: result.items.map(toDTO),
      total: result.total,
      page: filter.page,
      per_page: filter.per_page,
      total_pages: Math.ceil(result.total / filter.per_page),
    };
  }

  async updateEmployee(id: string, data: UpdatePayload): Promise<EmployeeDTO> {
    const existing = await this.findOrThrow(id);

    if (data.email && data.email !== existing.email) {
      const existingEmail = await this.employeeRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new ConflictError(`Email ${data.email} sudah terdaftar`);
      }
    }

    const existingPhotos = Array.isArray(existing.photos)
      ? (existing.photos as string[])
      : [];
    const newPhotos = data.photos ?? [];

    // Hitung ulang daftar foto final: URL yang dipertahankan (photoUrls,
    // hanya yang memang milik employee ini) + foto baru. BUKAN append ke daftar lama.
    const keptUrls =
      data.photoUrls !== undefined
        ? data.photoUrls.filter((url) => existingPhotos.includes(url))
        : existingPhotos;

    const photos = [...keptUrls, ...newPhotos];

    const employee = await this.employeeRepository.update(id, {
      name: data.name,
      email: data.email,
      password: data.password ? await bcrypt.hash(data.password, 12) : undefined,
      position: data.position,
      department: data.department,
      status: data.status,
      joinedAt: data.joinedAt,
      faceRegistered:
        photos.length === 0
          ? false
          : photos.length >= MAX_PHOTOS
            ? true
            : existing.faceRegistered,
      photos,
    });

    const photosChanged =
      newPhotos.length > 0 ||
      (data.photoUrls !== undefined && keptUrls.length !== existingPhotos.length);
    const nameChanged = data.name !== undefined && data.name !== existing.name;

    if (photos.length === 0 && existingPhotos.length > 0) {
      // Semua foto dihapus → hapus wajah dari engine pengenalan/ML.
      this.removeFromMl(employee);
    } else if (photosChanged || nameChanged) {
      this.syncToMl(employee);
    }

    // Best-effort: hapus file lama yang tidak lagi dipertahankan.
    const removed = existingPhotos.filter((url) => !keptUrls.includes(url));
    if (removed.length > 0) {
      this.deleteRemovedPhotos(removed);
    }

    return toDTO(employee);
  }

  async toggleStatus(id: string): Promise<EmployeeDTO> {
    const existing = await this.findOrThrow(id);
    const next = existing.status === 'Active' ? 'Inactive' : 'Active';
    const employee = await this.employeeRepository.toggleStatus(id, next);
    return toDTO(employee);
  }

  async toggleFace(id: string): Promise<EmployeeDTO> {
    const existing = await this.findOrThrow(id);
    const employee = await this.employeeRepository.toggleFace(
      id,
      !existing.faceRegistered,
    );
    return toDTO(employee);
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await this.findOrThrow(id);
    await this.employeeRepository.delete(id);
    this.removeFromMl(employee);
  }

  private async findOrThrow(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  private deleteRemovedPhotos(urls: string[]): void {
    void deleteEmployeePhotoFiles(urls).catch((err: unknown) => {
      logger.warn('Gagal menghapus foto lama dari storage', {
        urls,
        error: err instanceof Error ? err.message : 'unknown',
      });
    });
  }

  private async findByUuidOrEmployeeId(identifier: string): Promise<Employee> {
    const employee =
      (await this.employeeRepository.findById(identifier)) ??
      (await this.employeeRepository.findByEmployeeId(identifier));

    if (!employee) {
      throw new NotFoundError('Karyawan tidak ditemukan');
    }
    return employee;
  }

  private syncToMl(employee: Employee): void {
    if (!this.mlRegister) return;
    void this.mlRegister
      .registerEmployee({
        employeeId: employee.employeeId,
        name: employee.name,
        photos: Array.isArray(employee.photos) ? (employee.photos as string[]) : [],
      })
      .catch((err: unknown) => {
        // registerEmployee sudah menangani error internal; log sebagai jaga-jaga
        logger.error('Sync foto wajah ke ML gagal', {
          employeeId: employee.employeeId,
          error: err instanceof Error ? err.message : 'unknown',
        });
      });
  }

  private removeFromMl(employee: Employee): void {
    if (!this.mlRegister) return;
    void this.mlRegister
      .removeEmployee({
        employeeId: employee.employeeId,
        name: employee.name,
      })
      .catch((err: unknown) => {
        logger.error('Hapus wajah dari ML gagal', {
          employeeId: employee.employeeId,
          error: err instanceof Error ? err.message : 'unknown',
        });
      });
  }
}