import { Router } from 'express';
import { LiveMonitoringController } from '../controllers/live.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { sseAuthMiddleware } from '../middlewares/sseAuth.middleware';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';

export const createLiveRouter = (
  liveMonitoringController: LiveMonitoringController,
): Router => {
  const router = Router();

  /**
   * @route   GET /api/v1/live/feeds
   * @desc    Daftar kamera untuk feed live monitoring
   * @access  Web Client (JWT)
   */
  router.get('/feeds', authMiddleware, liveMonitoringController.getFeeds);

  /**
   * @route   GET /api/v1/live/recognitions?limit=8&cameraId=&status=
   * @desc    Riwayat terakhir hasil pengenalan wajah
   * @access  Web Client (JWT)
   */
  router.get('/recognitions', authMiddleware, liveMonitoringController.getRecognitions);

  /**
   * @route   GET /api/v1/live/notifications?limit=20&type=&read=
   * @desc    Daftar notifikasi live monitoring
   * @access  Web Client (JWT)
   */
  router.get('/notifications', authMiddleware, liveMonitoringController.getNotifications);

  /**
   * @route   PATCH /api/v1/live/notifications/read-all
   * @desc    Tandai semua notifikasi sudah dibaca
   * @access  Web Client (JWT)
   */
  router.patch('/notifications/read-all', authMiddleware, liveMonitoringController.markAllRead);

  /**
   * @route   PATCH /api/v1/live/notifications/:id/read
   * @desc    Tandai satu notifikasi sudah dibaca
   * @access  Web Client (JWT)
   */
  router.patch('/notifications/:id/read', authMiddleware, liveMonitoringController.markNotificationRead);

  /**
   * @route   GET /api/v1/live/events?token=<JWT>
   * @desc    SSE realtime (recognition, unknown, camera_online/offline, checkin)
   * @access  Web Client (JWT via query param, EventSource tidak bisa set header)
   */
  router.get('/events', sseAuthMiddleware, liveMonitoringController.handleEvents);

  /**
   * @route   POST /api/v1/live/recognition-events
   * @desc    Webhook dari ML engine untuk mencatat hasil pengenalan
   * @access  ML (API Key)
   */
  router.post('/recognition-events', apiKeyMiddleware, liveMonitoringController.recordRecognition);

  return router;
};
