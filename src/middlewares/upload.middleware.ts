import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  cloudinaryV2,
  cloudinaryIsConfigured,
  FACE_PHOTO_FOLDER,
  FACE_PHOTO_MAX_SIZE,
  FACE_PHOTO_MAX_COUNT,
} from '../config/cloudinary';
import { ValidationError } from '../errors/ValidationError';
import { logger } from '../config/logger';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: FACE_PHOTO_MAX_SIZE, files: FACE_PHOTO_MAX_COUNT },
  fileFilter: (_req: Request, file: Express.Multer.File, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Hanya file gambar yang diperbolehkan'));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(
  buffer: Buffer,
  _originalname: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const stream = cloudinaryV2.uploader.upload_stream(
      {
        folder: FACE_PHOTO_FOLDER,
        public_id: publicId,
        format: 'webp',
        transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto' }],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          logger.error('Gagal upload ke Cloudinary', { error: error.message });
          reject(error);
          return;
        }
        resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function uploadPhotos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  upload.array('photos', FACE_PHOTO_MAX_COUNT)(req, res, async (err: unknown) => {
    if (err) {
      return next(err instanceof Error ? err : new Error(String(err)));
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (files.length === 0) {
      req.uploadedPhotos = [];
      return next();
    }

    if (!cloudinaryIsConfigured) {
      return next(
        new ValidationError(
          'Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di .env',
        ),
      );
    }

    try {
      const urls = await Promise.all(
        files.map((file) => uploadToCloudinary(file.buffer, file.originalname)),
      );
      req.uploadedPhotos = urls;
      next();
    } catch (uploadError) {
      logger.error('Gagal mengunggah foto ke Cloudinary', {
        error: uploadError instanceof Error ? uploadError.message : 'unknown',
      });
      next(
        new ValidationError(
          'Gagal mengunggah foto ke Cloudinary. Periksa kredensial CLOUDINARY di .env',
        ),
      );
    }
  });
}