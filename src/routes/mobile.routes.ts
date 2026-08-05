import { Router } from 'express';
import { MobileController } from '../controllers/mobile.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

export const createMobileRouter = (
  mobileController: MobileController,
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
   * @route   POST /api/v1/mobile/attendance
   * @desc    Melakukan absensi via mobile app
   * @access  EMPLOYEE
   */
  router.post('/attendance', authMiddleware, requireRole('EMPLOYEE'), mobileController.checkIn);

  /**
   * @route   GET /api/v1/mobile/attendance/history
   * @desc    Mendapatkan riwayat absensi employee yang login
   * @access  EMPLOYEE
   */
  router.get('/attendance/history', authMiddleware, requireRole('EMPLOYEE'), mobileController.getHistory);

  return router;
};
