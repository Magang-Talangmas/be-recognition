import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { logger } from '../../config/logger';

let isFirebaseInitialized = false;

try {
  // If user provides FIREBASE_SERVICE_ACCOUNT env string (JSON representation)
  // or default credentials, try initializing it.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    logger.info('Firebase Admin terinisialisasi');
  } else {
    logger.warn('FIREBASE_SERVICE_ACCOUNT tidak ditemukan di env, fitur Push Notification dinonaktifkan.');
  }
} catch (error) {
  logger.error('Gagal menginisialisasi Firebase Admin', error);
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<void> => {
  if (!isFirebaseInitialized) {
    logger.warn(`Push Notification dilewati (Firebase tidak aktif). Tujuan: ${token}`);
    return;
  }

  try {
    const message: Message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
      },
    };

    const response = await getMessaging().send(message);
    logger.info(`Berhasil mengirim push notification: ${response}`);
  } catch (error) {
    logger.error('Gagal mengirim push notification', error);
  }
};
