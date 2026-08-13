import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError';
import { HTTP_STATUS } from '../constants/http.constants';

const optionalString = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((val) => (val === '' ? undefined : val));

export const recognitionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
  cameraId: optionalString(z.string().trim()),
  status: z.enum(['Verified', 'Unknown', 'Rejected']).optional(),
});

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['checkin', 'unknown', 'cctv', 'recognition', 'system']).optional(),
  read: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export const recordRecognitionSchema = z.object({
  employeeId: optionalString(z.string().trim().min(1)),
  cameraId: z.string().trim().min(1, 'cameraId wajib diisi'),
  confidence: z
    .number()
    .min(0, 'confidence minimal 0')
    .max(100, 'confidence maksimal 100'),
  status: z.enum(['Verified', 'Unknown', 'Rejected']).optional(),
  thumbnail: optionalString(z.string().trim()),
  timestamp: optionalString(z.string()),
});

export const systemNotificationSchema = z.object({
  title: z.string().trim().min(1, 'title wajib diisi'),
  description: z.string().trim().min(1, 'description wajib diisi'),
});

export type RecognitionQueryInput = z.infer<typeof recognitionQuerySchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type RecordRecognitionInput = z.infer<typeof recordRecognitionSchema>;

/**
 * Parse body/query dan ubah ZodError menjadi ValidationError 422
 * agar sesuai kontrak: { success: false, message: "Validasi gagal", errors }
 */
export function parseAsUnprocessable<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
): z.output<S> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((zodErr) => {
        const field = zodErr.path.join('.') || 'body';
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(zodErr.message);
      });
      throw new ValidationError(
        'Validasi gagal',
        errors,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }
    throw error;
  }
}
