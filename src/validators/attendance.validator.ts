import { z } from 'zod';

export const AttendanceEventType = z.enum([
  'CHECK_IN',
  'CHECK_OUT',
  'START_BREAK',
  'RETURN_FROM_BREAK',
  'TEMPORARY_EXIT',
  'RETURN_FROM_TEMPORARY_EXIT',
]);

export type AttendanceEventTypeValue = z.infer<typeof AttendanceEventType>;

export const ConfirmationStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'REJECTED',
]);

export type ConfirmationStatusValue = z.infer<typeof ConfirmationStatusEnum>;

export const attendanceBodySchema = z.object({
  event_id: z
    .string()
    .uuid({ message: 'event_id harus berformat UUID jika disertakan' })
    .optional(),

  employee_id: z
    .string({ required_error: 'employee_id wajib diisi' })
    .min(1, 'employee_id tidak boleh kosong')
    .trim(),

  event_type: AttendanceEventType,

  similarity: z
    .number()
    .min(0, 'similarity harus antara 0.0 dan 1.0')
    .max(1, 'similarity harus antara 0.0 dan 1.0')
    .optional(),

  detected_at: z
    .string({ required_error: 'detected_at wajib diisi' })
    .datetime({ offset: true, message: 'detected_at harus berformat ISO 8601' }),

  camera_id: z
    .string()
    .min(1, 'camera_id tidak boleh kosong jika disertakan')
    .trim()
    .optional(),
});

export const attendanceFilterSchema = z.object({
  employee_id: z.string().optional(),
  event_type: AttendanceEventType.optional(),
  confirmation_status: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(ConfirmationStatusEnum)
    .optional(),
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

export const updateConfirmationStatusSchema = z.object({
  status: z
    .string({ required_error: 'status wajib diisi' })
    .transform((val) => val.toUpperCase())
    .pipe(ConfirmationStatusEnum),
});

export type AttendanceBodyInput = z.infer<typeof attendanceBodySchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
export type UpdateConfirmationStatusInput = z.infer<typeof updateConfirmationStatusSchema>;
