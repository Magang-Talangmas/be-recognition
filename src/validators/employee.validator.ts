import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z
    .string({ required_error: 'employeeId wajib diisi' })
    .min(1, 'employeeId tidak boleh kosong')
    .trim(),
  name: z
    .string({ required_error: 'name wajib diisi' })
    .min(1, 'name tidak boleh kosong')
    .trim(),
  department: z.string().trim().optional(),
  position: z.string().trim().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ employeeId: true });

export const employeeFilterSchema = z.object({
  department: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
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

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>;
