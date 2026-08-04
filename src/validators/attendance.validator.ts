import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const attendanceBodySchema = z.object({
  employee_id: z
    .string()
    .min(1, 'employee_id tidak boleh kosong')
    .trim()
    .optional(),
  camera_id: z
    .string({ required_error: 'camera_id wajib diisi' })
    .min(1, 'camera_id tidak boleh kosong')
    .trim(),
  timestamp: z
    .string({ required_error: 'timestamp wajib diisi' })
    .min(1, 'timestamp tidak boleh kosong')
    .datetime({ message: 'timestamp harus berformat ISO 8601 (contoh: 2026-08-03T08:00:00Z)' }),
  status: z
    .enum(Object.values(AttendanceStatus) as [AttendanceStatus, ...AttendanceStatus[]])
    .optional(),
});

export const attendanceFilterSchema = z.object({
  employee_id: z.string().optional(),
  start_date: z
    .string()
    .datetime({ message: 'start_date harus berformat ISO 8601' })
    .optional(),
  end_date: z
    .string()
    .datetime({ message: 'end_date harus berformat ISO 8601' })
    .optional(),
  page: z
    .string()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1, 'page minimal 1')),
  limit: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100, 'limit maksimal 100')),
});

export type AttendanceBodyInput = z.infer<typeof attendanceBodySchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
