import cloudinary from 'cloudinary';
import { env } from './env';

const isConfigured =
  Boolean(env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(env.CLOUDINARY_API_KEY) &&
  Boolean(env.CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.v2.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const cloudinaryV2 = cloudinary.v2;
export const cloudinaryIsConfigured = isConfigured;

export const FACE_PHOTO_FOLDER = 'recognition/faces';
export const FACE_PHOTO_MAX_SIZE = 10 * 1024 * 1024;
export const FACE_PHOTO_MAX_COUNT = 3;
