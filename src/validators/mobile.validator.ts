import { z } from 'zod';

export const mobileLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const deviceTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM Token wajib diisi'),
});

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;
