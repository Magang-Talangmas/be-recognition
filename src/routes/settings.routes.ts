import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

export const createSettingsRouter = (
  controller: SettingsController,
): Router => {
  const router = Router();

  // Membutuhkan login
  router.use(authMiddleware);

  router.get('/', controller.getSettings);
  router.put('/', requireRole(Role.ADMIN), controller.updateSettings);
  router.patch('/', requireRole(Role.ADMIN), controller.updateSettings);
  router.post('/reset', requireRole(Role.ADMIN), controller.resetSettings);

  return router;
};
