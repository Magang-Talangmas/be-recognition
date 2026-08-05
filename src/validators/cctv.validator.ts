import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError';
import { HTTP_STATUS } from '../constants/http.constants';

const optionalString = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((val) => (val === '' ? undefined : val));

const RTSP_URL_REGEX = /^rtsps?:\/\/[^\s/]+(\/[^\s]*)?$/i;

export const createCctvSchema = z.object({
  name: z
    .string({ required_error: 'name wajib diisi' })
    .trim()
    .min(1, 'name tidak boleh kosong'),
  location: z
    .string({ required_error: 'location wajib diisi' })
    .trim()
    .min(1, 'location tidak boleh kosong'),
  rtspUrl: z
    .string({ required_error: 'rtspUrl wajib diisi' })
    .trim()
    .regex(RTSP_URL_REGEX, 'Format RTSP URL tidak valid'),
  online: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const updateCctvSchema = z.object({
  name: optionalString(z.string().trim().min(1, 'name tidak boleh kosong')),
  location: optionalString(z.string().trim().min(1, 'location tidak boleh kosong')),
  rtspUrl: optionalString(
    z.string().trim().regex(RTSP_URL_REGEX, 'Format RTSP URL tidak valid'),
  ),
  online: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const cctvFilterSchema = z.object({
  search: optionalString(z.string().trim()),
  status: z.enum(['online', 'offline']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
});

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

export type CreateCctvInput = z.infer<typeof createCctvSchema>;
export type UpdateCctvInput = z.infer<typeof updateCctvSchema>;
export type CctvFilterInput = z.infer<typeof cctvFilterSchema>;
