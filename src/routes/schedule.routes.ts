import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

export const createScheduleRouter = (
  controller: ScheduleController,
): Router => {
  const router = Router();

  // Membutuhkan login
  router.use(authMiddleware);

  router.post('/', requireRole(Role.ADMIN), controller.createSchedule);
  router.get('/', controller.getAllSchedules);
  router.get('/:id', controller.getScheduleById);
  router.patch('/:id', requireRole(Role.ADMIN), controller.updateSchedule);
  router.delete('/:id', requireRole(Role.ADMIN), controller.deleteSchedule);

  return router;
};
