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
  JWT_SECRET: z
    .string()
    .transform((val) => (val.startsWith('<') || val.length < 32 ? 'super-secret-jwt-key-min-32-chars-for-dev-and-test' : val))
    .pipe(z.string().min(32, 'JWT_SECRET minimal 32 karakter')),
  ML_API_KEY: z
    .string()
    .transform((val) => (val.startsWith('<') ? 'ml-api-key-default-dev' : val))
    .pipe(z.string().min(1, 'ML_API_KEY wajib diisi')),
  AI_STREAM_BASE_URL: z
    .string()
    .default('http://192.168.77.171:8888'),
  AI_STREAM_HLS_BASE_URL: z.string().default(''),
  AI_STREAM_WHEP_URL: z
    .string()
    .default('http://192.168.77.171:8889/stream/whep'),
  AI_STREAM_URL: z
    .string()
    .default('http://192.168.77.172:8000/api/v1/video_feed'),
  STORAGE_PROVIDER: z.enum(['minio', 'supabase']).default('minio'),
  MINIO_ENDPOINT: z.string().default('http://localhost:9000'),
  MINIO_PUBLIC_URL: z.string().default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().default(''),
  MINIO_SECRET_KEY: z.string().default(''),
  MINIO_BUCKET: z.string().default('recognition'),
  MINIO_REGION: z.string().default('us-east-1'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('recognition'),
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .default('')
    .transform((val) => (val.startsWith('<') ? '' : val))
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
    .default('0.35')
    .transform((val) => parseFloat(val)),
  ML_REMOVE_URL: z
    .string()
    .default('')
    .transform((val) => (val.startsWith('<') ? '' : val))
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
  if (process.env.NODE_ENV === 'test') {
    console.warn('⚠️ Warning: Konfigurasi environment tidak lengkap di test mode');
  } else {
    console.error('❌ Konfigurasi environment tidak valid:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>);
export type Env = z.infer<typeof envSchema>;
