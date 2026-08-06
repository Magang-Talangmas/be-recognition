import { z } from 'zod';

export const PERMISSION_TYPES = ['Sakit', 'Izin', 'Cuti', 'Lainnya'] as const;
export const PERMISSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const createPermissionSchema = z.object({
  employeeId: z.string().trim().min(1, 'employeeId wajib diisi').optional(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  type: z.enum(PERMISSION_TYPES),
  reason: z.string().trim().min(1, 'reason wajib diisi'),
});

export const updatePermissionStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const permissionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PERMISSION_STATUSES).optional(),
  employeeId: z.string().trim().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionStatusInput = z.infer<
  typeof updatePermissionStatusSchema
>;
export type PermissionQueryInput = z.infer<typeof permissionQuerySchema>;
