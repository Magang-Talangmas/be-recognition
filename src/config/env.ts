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
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL wajib diisi'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY wajib diisi'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, 'SUPABASE_STORAGE_BUCKET wajib diisi'),
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
  ML_REGISTER_URL: z.string().default('http://192.168.77.171:8088/register'),
  ML_REGISTER_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi environment tidak valid:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
