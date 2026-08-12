import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { faceBboxCache } from '../services/ml-detect.service';
import sharp from 'sharp';

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
    let buffer = Buffer.from(arrayBuffer);
    
    // Coba crop gambar jika ada kordinat wajah (bbox) di cache
    const bbox = faceBboxCache.get(employeeId);
    if (bbox && bbox.length === 4) {
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.width && metadata.height) {
          // Koordinat bbox dari AI Engine dihitung berdasarkan resolusi deteksi (biasanya 640x480)
          // Sedangkan snapshot dari kamera bisa beresolusi penuh (misal 1920x1080)
          // Kita harus melakukan scaling (perkalian skala) agar posisinya akurat
          const DETECT_WIDTH = 640;
          const DETECT_HEIGHT = 480;
          
          const scaleX = metadata.width / DETECT_WIDTH;
          const scaleY = metadata.height / DETECT_HEIGHT;

          const [origX1, origY1, origX2, origY2] = bbox;
          
          const x1 = origX1 * scaleX;
          const y1 = origY1 * scaleY;
          const x2 = origX2 * scaleX;
          const y2 = origY2 * scaleY;

          let faceWidth = x2 - x1;
          let faceHeight = y2 - y1;
          
          // Tambahkan margin 20% agar wajah tidak terlalu ngepas
          const marginX = faceWidth * 0.2;
          const marginY = faceHeight * 0.2;
          
          let left = Math.max(0, Math.floor(x1 - marginX));
          let top = Math.max(0, Math.floor(y1 - marginY));
          let width = Math.min(metadata.width - left, Math.floor(faceWidth + (marginX * 2)));
          let height = Math.min(metadata.height - top, Math.floor(faceHeight + (marginY * 2)));
          
          buffer = await sharp(buffer)
            .extract({ left, top, width, height })
            .jpeg({ quality: 90 })
            .toBuffer();
            
          console.log(`[SNAPSHOT] Berhasil memotong wajah untuk ${employeeId}`);
        }
      } catch (cropErr) {
        console.error(`[SNAPSHOT] Gagal memotong gambar untuk ${employeeId}:`, cropErr);
        // Fallback: gunakan buffer asli (layar penuh) jika gagal crop
      }
    }

    console.log(`[SNAPSHOT] Berhasil fetch/crop gambar (${buffer.length} bytes). Mengunggah ke Supabase...`);

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
