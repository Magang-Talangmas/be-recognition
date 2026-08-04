import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createDashboardRouter = (
  dashboardController: DashboardController,
): Router => {
  const router = Router();

  // Dashboard read-only — cukup yang sudah terautentikasi
  router.use(authMiddleware);

  /**
   * @route   GET /api/v1/dashboard/summary
   * @desc    Statistik card dashboard
   * @access  Web Client (JWT)
   */
  router.get('/summary', dashboardController.getSummary);

  /**
   * @route   GET /api/v1/dashboard/recent-activity
   * @desc    Aktivitas pengenalan terbaru (limit 20)
   * @access  Web Client (JWT)
   */
  router.get('/recent-activity', dashboardController.getRecentActivity);

  return router;
};