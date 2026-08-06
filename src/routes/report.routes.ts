import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createReportRouter = (
  reportController: ReportController,
): Router => {
  const router = Router();

  // Report read-only — cukup yang sudah terautentikasi
  router.use(authMiddleware);

  /**
   * @route   GET /api/v1/reports
   * @desc    Report absensi & pengenalan wajah
   * @query   type=daily|weekly|monthly|employee|recognition|unknown (wajib),
   *          start_date, end_date (YYYY-MM-DD, opsional), page, per_page
   * @access  Web Client (JWT)
   */
  router.get('/', reportController.getReport);

  return router;
};
