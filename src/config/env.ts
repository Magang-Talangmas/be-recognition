import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  REDIS_URL: z.string().min(1, 'REDIS_URL wajib diisi'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  ML_API_KEY: z.string().min(1, 'ML_API_KEY wajib diisi'),
  AI_STREAM_BASE_URL: z
    .string()
    .default('http://192.168.77.171:8888'),
  AI_STREAM_WHEP_URL: z
    .string()
    .default('http://192.168.77.171:8889/stream/whep'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL wajib diisi'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY wajib diisi'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, 'SUPABASE_STORAGE_BUCKET wajib diisi'),
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .default('')
    .superRefine((val, ctx) => {
      if (val && !val.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FIREBASE_SERVICE_ACCOUNT tidak boleh hanya spasi' });
      }
      if (val.trim()) {
        try {
          JSON.parse(val);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'FIREBASE_SERVICE_ACCOUNT harus berupa JSON Service Account yang valid',
          });
        }
      }
    }),
  ML_DETECT_URL: z.string().default('http://192.168.77.171:8088/detect'),
  ML_DETECT_INTERVAL_MS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  ML_DETECT_CAMERA_ID: z.string().default('CAM-05'),
  ML_DETECT_SIMILARITY_THRESHOLD: z
    .string()
    .default('10')
    .transform((val) => parseFloat(val)),
  ML_DETECT_DEDUP_SECONDS: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10)),
  ML_REGISTER_URL: z
    .string()
    .default('http://192.168.77.171:8088/api/v1/employees/sync-ml'),
  ML_REGISTER_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  ML_REGISTER_TIMEOUT_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
  ML_VERIFY_FACE_URL: z
    .string()
    .default('http://localhost:5001/verify-face'),
  ML_VERIFY_FACE_THRESHOLD: z
    .string()
    .default('35')
    .transform((val) => parseFloat(val)),
  ML_REMOVE_URL: z
    .string()
    .default('')
    .refine((val) => val === '' || val.startsWith('http'), {
      message: 'ML_REMOVE_URL harus berupa URL http(s) atau kosong',
    }),
  SCHEDULE_REMINDER_INTERVAL_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
  SCHEDULE_REMINDER_EARLY_MINUTES: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  SCHEDULE_REMINDER_LATE_MINUTES: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi environment tidak valid:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
