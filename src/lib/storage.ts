import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { getSupabase } from './supabase/client';

const PHOTOS_FOLDER = 'employee_faces';
const PERMISSIONS_FOLDER = 'permissions';
const CHECKINS_FOLDER = 'checkins';

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
 * Menghapus file foto wajah dari Supabase Storage.
 * Hanya menghapus file di dalam folder employee_faces agar tidak
 * menyentuh foto check-in / izin.
 */
export async function deleteEmployeePhotoFiles(urls: string[]): Promise<void> {
  const paths: string[] = [];

  for (const url of urls) {
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      const publicIdx = parts.indexOf('public');
      if (publicIdx === -1) continue;
      const filePath = parts.slice(publicIdx + 2).join('/');
      if (!filePath.startsWith(`${PHOTOS_FOLDER}/`)) continue;
      paths.push(filePath);
    } catch {
      // URL tidak valid, abaikan
    }
  }

  if (paths.length === 0) return;

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .remove(paths);

  if (error) {
    throw new Error(`Hapus foto dari Supabase gagal: ${error.message}`);
  }
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

/**
 * Menghapus foto check-in dari Supabase Storage berdasarkan public URL.
 * Digunakan untuk cleanup foto yang sudah terlanjur di-upload tapi gagal verifikasi ML.
 */
export async function deleteCheckinPhotoByUrl(url: string): Promise<void> {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const publicIdx = parts.indexOf('public');
    if (publicIdx === -1) return;
    const filePath = parts.slice(publicIdx + 2).join('/');
    if (!filePath.startsWith(`${CHECKINS_FOLDER}/`)) return;

    const { error } = await getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error(`Gagal hapus foto check-in orphan: ${error.message}`);
    }
  } catch {
    // Abaikan error cleanup agar tidak mengganggu flow error utama
  }
}

const SNAPSHOT_FOLDER = 'weekly_recog';

/**
 * Mengambil frame terbaru dari stream CCTV (AI Engine) dan mengunggahnya ke Supabase Storage.
 * Path: snapshot/{employeeId}/{timestamp}-{uuid}.jpg
 */
export async function captureAndUploadSnapshot(
  employeeId: string,
  streamBaseUrl: string = process.env.AI_STREAM_BASE_URL || (env.ML_DETECT_URL ? new URL(env.ML_DETECT_URL).origin : 'http://localhost:8088'),
): Promise<string | null> {
  try {
    const targetUrl = `${streamBaseUrl}/snapshot`;
    console.log(`[SNAPSHOT] Mencoba fetch dari ${targetUrl} untuk ${employeeId}...`);
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`Gagal fetch snapshot dari ${targetUrl}: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[SNAPSHOT] Berhasil fetch gambar (${buffer.length} bytes). Mengunggah ke Supabase...`);

    const fileName = `${SNAPSHOT_FOLDER}/${employeeId}/${Date.now()}-${randomUUID()}.jpg`;

    const { error } = await getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload snapshot ke Supabase gagal: ${error.message}`);
    }

    const { data } = getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(fileName);

    console.log(`[SNAPSHOT] Berhasil upload ke ${data.publicUrl}`);
    return data.publicUrl;
  } catch (err) {
    console.error(`[SNAPSHOT ERROR] employeeId=${employeeId}:`, err);
    // Return null saja jika gagal capture/upload agar tidak menghalangi alur utama absensi
    return null;
  }
}

/**
 * Menghapus file snapshot dari Supabase Storage berdasarkan public URL.
 */
export async function deleteSnapshot(url: string): Promise<void> {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const publicIdx = parts.indexOf('public');
    if (publicIdx === -1) return;
    
    const filePath = parts.slice(publicIdx + 2).join('/');
    if (!filePath.startsWith(`${SNAPSHOT_FOLDER}/`)) return;

    const { error } = await getSupabase().storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Hapus snapshot dari Supabase gagal: ${error.message}`);
    }
  } catch {
    // Abaikan jika URL tidak valid atau penghapusan gagal
  }
}

export async function uploadRecognitionSnapshot(buffer: Buffer): Promise<string> {
  const fileName = `snapshots/${Date.now()}-${randomUUID()}.jpg`;

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload snapshot ke Supabase gagal: ${error.message}`);
  }

  const { data } = getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
