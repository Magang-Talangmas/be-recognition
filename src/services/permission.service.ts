import { PermissionRepository } from '../repositories/permission.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { uploadPermissionPhoto } from '../lib/storage';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';
import { HTTP_STATUS } from '../constants/http.constants';
import {
  CreatePermissionInput,
  PermissionQueryInput,
} from '../validators/permission.validator';
import {
  PermissionDTO,
  PermissionList,
  toPermissionDTO,
} from '../interfaces/permission.interface';

export class PermissionService {
  constructor(
    private readonly repository: PermissionRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async createPermission(
    input: CreatePermissionInput,
    file?: Express.Multer.File,
    autoApprove = false,
  ): Promise<PermissionDTO> {
    if (!input.employeeId) {
      throw new ValidationError('employeeId wajib diisi');
    }

    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError(
        `Employee dengan ID ${input.employeeId} tidak ditemukan`,
      );
    }

    if (!file) {
      throw new ValidationError(
        'Validasi gagal',
        { photo: ['File bukti izin wajib diunggah'] },
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const photoUrl = await uploadPermissionPhoto(file, input.employeeId, input.date);

    const created = await this.repository.create({
      employeeId: input.employeeId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      type: input.type,
      reason: input.reason,
      photoUrl,
      status: autoApprove ? 'APPROVED' : 'PENDING',
    });

    return toPermissionDTO(created);
  }

  async updateStatus(id: string, status: string): Promise<PermissionDTO> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Izin dengan ID ${id} tidak ditemukan`);
    }

    const updated = await this.repository.updateStatus(id, status);
    return toPermissionDTO(updated);
  }

  async getPermissions(filter: PermissionQueryInput): Promise<PermissionList> {
    const { items, total } = await this.repository.findMany(filter);
    return { items: items.map(toPermissionDTO), total };
  }
}
