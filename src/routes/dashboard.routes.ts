import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createDashboardRouter = (
  dashboardController: DashboardController,
): Router => {
  const router = Router();

  // Semua route dashboard memerlukan autentikasi JWT
  router.use(authMiddleware);

  /**
   * @route   GET /api/v1/dashboard/summary
   * @desc    Ringkasan statistik untuk halaman dashboard
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