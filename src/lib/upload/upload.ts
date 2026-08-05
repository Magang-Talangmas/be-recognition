import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../errors/ValidationError';
import { HTTP_STATUS } from '../../constants/http.constants';

export const MAX_PHOTOS = 3;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_PHOTOS,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(
        new ValidationError(
          'File harus berupa gambar',
          { photos: ['Hanya file gambar (jpg/png/webp) yang diperbolehkan'] },
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ),
      );
    }
    cb(null, true);
  },
});

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Ukuran file maksimal 10MB per foto',
  LIMIT_FILE_COUNT: 'Maksimal 3 foto',
  LIMIT_UNEXPECTED_FILE: 'Field upload harus bernama "photos"',
  LIMIT_FIELD_KEY: 'Field upload tidak dikenali',
};

function normalizeMulterError(err: unknown): unknown {
  if (err instanceof multer.MulterError) {
    return new ValidationError(
      'Upload file gagal',
      { photos: [MULTER_MESSAGES[err.code] ?? `Terjadi kesalahan upload: ${err.code}`] },
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
  return err;
}

export const uploadPhotos = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  upload.array('photos', MAX_PHOTOS)(req, res, (err: unknown) => {
    if (err) {
      next(normalizeMulterError(err));
      return;
    }
    next();
  });
};