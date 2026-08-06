import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

const PHOTOS_FOLDER = 'employee_faces';
const PERMISSIONS_FOLDER = 'permissions';
const CHECKINS_FOLDER = 'checkins';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

const MIMETYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionFor(mimetype: string): string {
  return MIMETYPE_EXTENSIONS[mimetype] ?? 'jpg';
}

export async function uploadEmployeePhotos(
  files: Express.Multer.File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const fileName = `${PHOTOS_FOLDER}/${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;

    const { error } = await getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload foto ke Supabase gagal: ${error.message}`);
    }

    const { data } = getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(fileName);

    urls.push(data.publicUrl);
  }

  return urls;
}

/**
 * Upload bukti foto izin ke Supabase Storage.
 * Path: permissions/{employeeId}/{date}-{timestamp}-{uuid}.{ext}
 */
export async function uploadPermissionPhoto(
  file: Express.Multer.File,
  employeeId: string,
  dateStr: string,
): Promise<string> {
  const fileName = `${PERMISSIONS_FOLDER}/${employeeId}/${dateStr}-${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload foto izin ke Supabase gagal: ${error.message}`);
  }

  const { data } = getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Upload foto bukti check-in mobile ke Supabase Storage.
 * Path: checkins/{employeeId}/{timestamp}-{uuid}.{ext}
 */
export async function uploadCheckinPhoto(
  file: Express.Multer.File,
  employeeId: string,
): Promise<string> {
  const fileName = `${CHECKINS_FOLDER}/${employeeId}/${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload foto check-in ke Supabase gagal: ${error.message}`);
  }

  const { data } = getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
