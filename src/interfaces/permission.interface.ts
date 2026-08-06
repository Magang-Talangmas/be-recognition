import { AttendancePermission } from '@prisma/client';

export type PermissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PermissionDTO {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: string;
  reason: string;
  photoUrl: string | null;
  status: PermissionStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface PermissionList {
  items: PermissionDTO[];
  total: number;
}

export interface PermissionFilter {
  limit: number;
  status?: PermissionStatus;
  employeeId?: string;
  date?: string; // YYYY-MM-DD
}

export function toPermissionDTO(permission: AttendancePermission): PermissionDTO {
  return {
    id: permission.id,
    employeeId: permission.employeeId,
    date: permission.date.toISOString().slice(0, 10),
    type: permission.type,
    reason: permission.reason,
    photoUrl: permission.photoUrl,
    status: permission.status as PermissionStatus,
    createdAt: permission.createdAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
  };
}
