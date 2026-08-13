import { Router } from 'express';
import { MobileController } from '../controllers/mobile.controller';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { uploadCheckinPhotos } from '../lib/upload/upload';

export const createMobileRouter = (
  mobileController: MobileController,
  notificationController?: NotificationController,
): Router => {
  const router = Router();

  /**
   * @route   POST /api/v1/mobile/auth/login
   * @desc    Login untuk employee di aplikasi mobile
   * @access  Public
   */
  router.post('/auth/login', mobileController.login);

  /**
   * @route   GET /api/v1/mobile/profile
   * @desc    Mendapatkan profil employee yang login
   * @access  EMPLOYEE
   */
  router.get('/profile', authMiddleware, requireRole('EMPLOYEE'), mobileController.getProfile);

  /**
   * @route   POST /api/v1/mobile/change-password
   * @desc    Ubah password employee yang login
   * @access  EMPLOYEE
   */
  router.post('/change-password', authMiddleware, requireRole('EMPLOYEE'), mobileController.changePassword);
  router.post('/profile/change-password', authMiddleware, requireRole('EMPLOYEE'), mobileController.changePassword);
  router.patch('/change-password', authMiddleware, requireRole('EMPLOYEE'), mobileController.changePassword);

  /**
   * @route   POST /api/v1/mobile/attendance
   * @desc    Melakukan absensi via mobile app (Face Scan - Menerima form-data gambar)
   * @access  EMPLOYEE
   */
  router.post('/attendance', authMiddleware, requireRole('EMPLOYEE'), uploadCheckinPhotos, mobileController.checkIn);

  /**
   * @route   GET /api/v1/mobile/recognitions/pending
   * @desc    Daftar deteksi wajah milik employee yang login dan masih menunggu konfirmasi (kartu wajah di Home)
   * @access  EMPLOYEE
   */
  router.get('/recognitions/pending', authMiddleware, requireRole('EMPLOYEE'), mobileController.getPendingRecognitions);

  /**
   * @route   POST /api/v1/mobile/recognition/:id/confirm
   * @desc    Konfirmasi data pengenalan wajah dari CCTV agar masuk ke absensi
   * @access  EMPLOYEE
   */
  router.post('/recognition/:id/confirm', authMiddleware, requireRole('EMPLOYEE'), mobileController.confirmRecognition);

  /**
   * @route   POST /api/v1/mobile/recognition/:id/reject
   * @desc    Menolak data pengenalan wajah (Bukan Saya)
   * @access  EMPLOYEE
   */
  router.post('/recognition/:id/reject', authMiddleware, requireRole('EMPLOYEE'), mobileController.rejectRecognition);

  /**
   * @route   PATCH /api/v1/mobile/device-token
   * @desc    Update FCM Device Token untuk Push Notification
   * @access  EMPLOYEE
   */
  router.patch('/device-token', authMiddleware, requireRole('EMPLOYEE'), mobileController.updateDeviceToken);

  /**
   * @route   GET /api/v1/mobile/attendance/history
   * @desc    Mendapatkan riwayat absensi employee yang login
   * @access  EMPLOYEE
   */
  router.get('/attendance/history', authMiddleware, requireRole('EMPLOYEE'), mobileController.getHistory);

  /**
   * @route   GET /api/v1/mobile/schedule/today
   * @desc    Mendapatkan jadwal hari ini untuk employee yang login
   * @access  EMPLOYEE
   */
  router.get('/schedule/today', authMiddleware, requireRole('EMPLOYEE'), mobileController.getTodaySchedule);

  /**
   * @route   GET /api/v1/mobile/notifications
   * @desc    Mendapatkan daftar notifikasi employee yang login
   * @access  EMPLOYEE
   */
  if (notificationController) {
    router.get('/notifications', authMiddleware, requireRole('EMPLOYEE'), notificationController.getNotifications);
    router.patch('/notifications/:id/read', authMiddleware, requireRole('EMPLOYEE'), notificationController.markAsRead);
  }

  /**
   * @route   PATCH /api/v1/mobile/recognition/:id/confirm
   * @desc    Konfirmasi kehadiran dari push notifikasi CCTV recognition
   * @access  EMPLOYEE
   */
  router.patch('/recognition/:id/confirm', authMiddleware, requireRole('EMPLOYEE'), mobileController.confirmRecognition);

  /**
   * @route   PATCH /api/v1/mobile/recognition/:id/reject
   * @desc    Tolak detection CCTV ('Bukan Saya')
   * @access  EMPLOYEE
   */
  router.patch('/recognition/:id/reject', authMiddleware, requireRole('EMPLOYEE'), mobileController.rejectRecognition);

  return router;
};
