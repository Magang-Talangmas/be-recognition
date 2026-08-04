import { z } from 'zod';

export const employeeStatusSchema = z.enum(['Active', 'Inactive']);

export const createEmployeeSchema = z.object({
  name: z
    .string({ required_error: 'name wajib diisi' })
    .min(1, 'name tidak boleh kosong')
    .trim(),
  email: z
    .string({ required_error: 'email wajib diisi' })
    .email('format email tidak valid')
    .toLowerCase()
    .trim(),
  position: z
    .string({ required_error: 'position wajib diisi' })
    .min(1, 'position tidak boleh kosong')
    .trim(),
  department: z
    .string({ required_error: 'department wajib diisi' })
    .min(1, 'department tidak boleh kosong')
    .trim(),
  status: employeeStatusSchema.optional(),
  password: z
    .string()
    .min(6, 'password minimal 6 karakter')
    .optional(),
  joinedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'joinedAt harus berformat YYYY-MM-DD')
    .optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeFilterSchema = z.object({
  search: z.string().trim().optional(),
  department: z.string().trim().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'Active' || val === 'Inactive') return val;
      return undefined;
    }),
  page: z
    .string()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1, 'page minimal 1')),
  per_page: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100, 'per_page maksimal 100')),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>;
