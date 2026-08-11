import { initializeApp, cert, ServiceAccount, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let app: App | null = null;

try {
  if (env.FIREBASE_SERVICE_ACCOUNT.trim()) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    logger.info('Firebase Admin terinisialisasi');
  } else {
    logger.warn('FIREBASE_SERVICE_ACCOUNT kosong, fitur Push Notification dinonaktifkan.');
  }
} catch (error) {
  app = null;
  logger.error('Gagal menginisialisasi Firebase Admin', error);
}

export const isFirebaseReady = (): boolean => app !== null;

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<void> => {
  if (!isFirebaseReady()) {
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