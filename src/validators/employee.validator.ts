import { z } from 'zod';

const optionalString = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((val) => (val === '' ? undefined : val));

const employeeBaseShape = {
  email: optionalString(z.string().trim().email('email tidak valid')),
  password: optionalString(z.string().min(6, 'password minimal 6 karakter')),
  position: optionalString(z.string().trim()),
  department: optionalString(z.string().trim()),
  status: z.enum(['Active', 'Inactive']).optional(),
  joinedAt: optionalString(z.string()).transform((val) =>
    val ? new Date(val) : undefined,
  ),
};

export const createEmployeeSchema = z.object({
  name: z
    .string({ required_error: 'name wajib diisi' })
    .trim()
    .min(1, 'name tidak boleh kosong'),
  ...employeeBaseShape,
});

export const updateEmployeeSchema = z.object({
  name: optionalString(z.string().trim().min(1, 'name tidak boleh kosong')),
  ...employeeBaseShape,
  photoUrls: z
    .union([z.literal(''), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      try {
        const parsed = JSON.parse(val) as unknown;
        if (!Array.isArray(parsed)) {
          throw new Error('photoUrls harus berupa array');
        }
        return parsed.filter((item): item is string => typeof item === 'string');
      } catch {
        throw new Error('photoUrls harus berupa JSON string array');
      }
    }),
});

export const employeeFilterSchema = z.object({
  search: optionalString(z.string().trim()),
  department: optionalString(z.string().trim()),
  status: z.enum(['Active', 'Inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>;