import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

export const createDashboardRouter = (
  dashboardController: DashboardController,
): Router => {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRole(Role.ADMIN));

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.get('/summary', dashboardController.getSummary);

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.get('/recent-activity', dashboardController.getRecentActivity);

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.get('/live-feed', dashboardController.getLiveFeed);

  return router;
};