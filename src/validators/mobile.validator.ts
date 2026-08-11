import { z } from 'zod';

export const mobileLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const deviceTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM Token wajib diisi'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
