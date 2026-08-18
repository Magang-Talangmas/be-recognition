import { initializeApp, cert, ServiceAccount, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { PrismaClient } from '@prisma/client';

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
  data?: { [key: string]: string },
  /** Optional: Prisma client used to auto-clear an invalid FCM token */
  prisma?: PrismaClient,
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
  } catch (error: any) {
    const errorCode: string = error?.errorInfo?.code ?? error?.code ?? '';
    const isStaleToken =
      errorCode === 'messaging/registration-token-not-registered' ||
      errorCode === 'messaging/invalid-registration-token' ||
      error?.message?.includes('NotRegistered') ||
      error?.message?.includes('UNREGISTERED');

    if (isStaleToken) {
      logger.warn('FCM token tidak valid (NotRegistered) — token akan dihapus dari DB', { token });
      if (prisma) {
        await prisma.employee
          .updateMany({
            where: { fcmToken: token },
            data: { fcmToken: null },
          })
          .catch((dbErr) =>
            logger.error('Gagal menghapus FCM token tidak valid dari DB', dbErr),
          );
      }
    } else {
      logger.error('Gagal mengirim push notification', error);
    }
  }
};