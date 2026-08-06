import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../errors/ValidationError';
import { HTTP_STATUS } from '../../constants/http.constants';

export const MAX_PHOTOS = 3;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const PERMISSION_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

const permissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PERMISSION_MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(
        new ValidationError(
          'File harus berupa gambar',
          { photo: ['Hanya file gambar (jpg/png/webp) yang diperbolehkan'] },
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

const PERMISSION_MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Ukuran file maksimal 5MB',
  LIMIT_FILE_COUNT: 'Maksimal 1 file',
  LIMIT_UNEXPECTED_FILE: 'Field upload harus bernama "photo"',
  LIMIT_FIELD_KEY: 'Field upload tidak dikenali',
};

function normalizeMulterError(
  err: unknown,
  field = 'photos',
  messages: Record<string, string> = MULTER_MESSAGES,
): unknown {
  if (err instanceof multer.MulterError) {
    return new ValidationError(
      'Upload file gagal',
      { [field]: [messages[err.code] ?? `Terjadi kesalahan upload: ${err.code}`] },
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

export const uploadCheckinPhotos = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  upload.fields([
    { name: 'photos', maxCount: MAX_PHOTOS },
    { name: 'photo', maxCount: 1 },
  ])(req, res, (err: unknown) => {
    if (err) {
      next(normalizeMulterError(err));
      return;
    }
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | Express.Multer.File[]
      | undefined;
    if (files && !Array.isArray(files)) {
      req.files = [
        ...(files['photos'] ?? []),
        ...(files['photo'] ?? []),
      ];
    }
    next();
  });
};

export const uploadPermissionPhoto = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  permissionUpload.single('photo')(req, res, (err: unknown) => {
    if (err) {
      next(normalizeMulterError(err, 'photo', PERMISSION_MULTER_MESSAGES));
      return;
    }
    next();
  });
};
