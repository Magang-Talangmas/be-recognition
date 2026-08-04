import cloudinary from 'cloudinary';
import { env } from '../config/env';

cloudinary.v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadEmployeePhotos(
  files: Express.Multer.File[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const uploaded = await cloudinary.v2.uploader.upload(base64, {
      folder: 'employee_faces',
      resource_type: 'image',
      transformation: [{ width: 800, height: 800, crop: 'limit' }],
    });

    urls.push(uploaded.secure_url);
  }

  return urls;
}