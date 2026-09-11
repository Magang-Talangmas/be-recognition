import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { getSupabase } from './supabase/client';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const PHOTOS_FOLDER = 'employee_faces';
const PERMISSIONS_FOLDER = 'permissions';
const CHECKINS_FOLDER = 'checkins';
const SNAPSHOT_FOLDER = 'weekly_recog';

const MIMETYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionFor(mimetype: string): string {
  return MIMETYPE_EXTENSIONS[mimetype] ?? 'jpg';
}

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.MINIO_ENDPOINT,
      region: env.MINIO_REGION || 'us-east-1',
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function isMinio(): boolean {
  return env.STORAGE_PROVIDER === 'minio';
}

function getPublicUrl(fileName: string): string {
  if (isMinio()) {
    const base = env.MINIO_PUBLIC_URL.replace(/\/+$/, '');
    return `${base}/${env.MINIO_BUCKET}/${fileName}`;
  }
  const { data } = getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(fileName);
  return data.publicUrl;
}

async function uploadBuffer(fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  if (isMinio()) {
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: env.MINIO_BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return getPublicUrl(fileName);
  }

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload file ke Supabase gagal: ${error.message}`);
  }

  return getPublicUrl(fileName);
}

function extractFilePathFromUrl(url: string, prefixFolder: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);

    // Format Supabase: .../public/bucket_name/folder/file.jpg
    const publicIdx = parts.indexOf('public');
    if (publicIdx !== -1) {
      const filePath = parts.slice(publicIdx + 2).join('/');
      if (filePath.startsWith(`${prefixFolder}/`)) return filePath;
    }

    // Format MinIO / S3: /bucket_name/folder/file.jpg
    if (parts.length >= 2) {
      // Hilangkan nama bucket (parts[0])
      const filePath = parts.slice(1).join('/');
      if (filePath.startsWith(`${prefixFolder}/`)) return filePath;
    }

    return null;
  } catch {
    return null;
  }
}

async function deleteFileByPath(filePath: string): Promise<void> {
  if (isMinio()) {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.MINIO_BUCKET,
        Key: filePath,
      }),
    );
    return;
  }

  const { error } = await getSupabase().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Hapus file dari Supabase gagal: ${error.message}`);
  }
}

export async function uploadEmployeePhotos(
  files: Express.Multer.File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const fileName = `${PHOTOS_FOLDER}/${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;
    const url = await uploadBuffer(fileName, file.buffer, file.mimetype || 'image/jpeg');
    urls.push(url);
  }

  return urls;
}

export async function deleteEmployeePhotoFiles(urls: string[]): Promise<void> {
  for (const url of urls) {
    const filePath = extractFilePathFromUrl(url, PHOTOS_FOLDER);
    if (filePath) {
      try {
        await deleteFileByPath(filePath);
      } catch (err) {
        console.error(`Gagal hapus employee photo file ${filePath}:`, err);
      }
    }
  }
}

export async function uploadPermissionPhoto(
  file: Express.Multer.File,
  employeeId: string,
  dateStr: string,
): Promise<string> {
  const fileName = `${PERMISSIONS_FOLDER}/${employeeId}/${dateStr}-${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;
  return uploadBuffer(fileName, file.buffer, file.mimetype || 'image/jpeg');
}

export async function uploadCheckinPhoto(
  file: Express.Multer.File,
  employeeId: string,
): Promise<string> {
  const fileName = `${CHECKINS_FOLDER}/${employeeId}/${Date.now()}-${randomUUID()}.${extensionFor(file.mimetype)}`;
  return uploadBuffer(fileName, file.buffer, file.mimetype || 'image/jpeg');
}

export async function deleteCheckinPhotoByUrl(url: string): Promise<void> {
  const filePath = extractFilePathFromUrl(url, CHECKINS_FOLDER);
  if (!filePath) return;

  try {
    await deleteFileByPath(filePath);
  } catch (err) {
    console.error(`Gagal hapus foto check-in orphan:`, err);
  }
}

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
    console.log(`[SNAPSHOT] Berhasil fetch gambar (${buffer.length} bytes). Mengunggah...`);

    const fileName = `${SNAPSHOT_FOLDER}/${employeeId}/${Date.now()}-${randomUUID()}.jpg`;
    const publicUrl = await uploadBuffer(fileName, buffer, 'image/jpeg');

    console.log(`[SNAPSHOT] Berhasil upload ke ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`[SNAPSHOT ERROR] employeeId=${employeeId}:`, err);
    return null;
  }
}

export async function deleteSnapshot(url: string): Promise<void> {
  const filePath = extractFilePathFromUrl(url, SNAPSHOT_FOLDER);
  if (!filePath) return;

  try {
    await deleteFileByPath(filePath);
  } catch (err) {
    console.error(`Gagal hapus snapshot:`, err);
  }
}

export async function uploadRecognitionSnapshot(buffer: Buffer): Promise<string> {
  const fileName = `snapshots/${Date.now()}-${randomUUID()}.jpg`;
  return uploadBuffer(fileName, buffer, 'image/jpeg');
}
