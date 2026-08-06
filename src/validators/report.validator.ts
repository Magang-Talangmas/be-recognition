import { z } from 'zod';

export const ReportTypeEnum = z.enum([
  'daily',
  'weekly',
  'monthly',
  'employee',
  'recognition',
  'unknown',
]);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal harus berformat YYYY-MM-DD')
  .refine(
    (value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: 'tanggal tidak valid' },
  );

export const reportQuerySchema = z
  .object({
    type: ReportTypeEnum,
    start_date: dateString.optional(),
    end_date: dateString.optional(),
    page: z.coerce.number().int().min(1, 'page minimal 1').default(1),
    per_page: z.coerce.number().int().min(1).max(100, 'per_page maksimal 100').default(10),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.start_date > data.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start_date tidak boleh melebihi end_date',
        path: ['start_date'],
      });
    }
  });

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type ReportTypeValue = z.infer<typeof ReportTypeEnum>;
