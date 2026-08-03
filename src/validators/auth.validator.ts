import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email wajib diisi' })
    .email('format email tidak valid')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'password wajib diisi' })
    .min(1, 'password tidak boleh kosong'),
});

export type LoginInput = z.infer<typeof loginSchema>;
