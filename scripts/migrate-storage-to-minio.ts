import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

// Konfigurasi Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = process.env.MINIO_BUCKET || 'recognition';

// Konfigurasi MinIO
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Wajib true untuk MinIO
});

function getMimeType(fileName: string): string {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
}

async function listAllFilesRecursively(folder = ''): Promise<string[]> {
  const filePaths: string[] = [];
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Gagal melist folder "${folder}":`, error.message);
    return filePaths;
  }

  if (!data) return filePaths;

  for (const item of data) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.id === null) {
      // Ini adalah subfolder, kita jelajahi secara rekursif
      const subFiles = await listAllFilesRecursively(itemPath);
      filePaths.push(...subFiles);
    } else {
      // Ini adalah file fisik
      if (item.name !== '.emptyFolderPlaceholder') {
        filePaths.push(itemPath);
      }
    }
  }

  return filePaths;
}

async function migrate() {
  console.log('=== MEMULAI MIGRASI SUPABASE STORAGE ➜ MINIO ===');
  console.log(`Sumber (Supabase): ${SUPABASE_URL} [bucket: ${BUCKET_NAME}]`);
  console.log(`Target (MinIO)   : ${MINIO_ENDPOINT} [bucket: ${BUCKET_NAME}]`);
  console.log('--------------------------------------------------');

  console.log('🔍 Sedang memindai semua file di Supabase Storage...');
  const allFiles = await listAllFilesRecursively('');
  console.log(`📦 Ditemukan total ${allFiles.length} file untuk dipindahkan.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const progress = `[${i + 1}/${allFiles.length}]`;

    try {
      // 1. Download dari Supabase
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(filePath);
      if (error || !data) {
        throw new Error(error?.message || 'Data buffer kosong');
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Upload ke MinIO
      const contentType = getMimeType(filePath);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filePath,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      console.log(`✅ ${progress} Sukses: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ ${progress} Gagal: ${filePath} -> ${err.message}`);
      failCount++;
    }
  }

  console.log('--------------------------------------------------');
  console.log(`🎉 MIGRASI SELESAI!`);
  console.log(`✅ Berhasil dipindahkan: ${successCount}`);
  if (failCount > 0) {
    console.log(`⚠️ Gagal dipindahkan   : ${failCount}`);
  }
}

migrate().catch((err) => {
  console.error('Fatal Error during migration:', err);
  process.exit(1);
});
