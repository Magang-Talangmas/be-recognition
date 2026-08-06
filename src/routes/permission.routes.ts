import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { uploadPermissionPhoto } from '../lib/upload/upload';
import { Role } from '@prisma/client';

export const createPermissionRouter = (
  controller: PermissionController,
): Router => {
  const router = Router();

  // Membutuhkan login
  router.use(authMiddleware);

  /**
   * @route   POST /api/v1/attendance/permissions
   * @desc    Ajukan izin (multipart: employeeId, date, type, reason, photo)
   * @access  Web Client / Mobile (JWT)
   */
  router.post('/', uploadPermissionPhoto, controller.createPermission);

  /**
   * @route   GET /api/v1/attendance/permissions?limit=&status=&employeeId=&date=
   * @desc    Daftar izin
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/', controller.getPermissions);

  /**
   * @route   PATCH /api/v1/attendance/permissions/:id
   * @desc    Konfirmasi izin (APPROVED / REJECTED)
   * @access  ADMIN
   */
  router.patch('/:id', requireRole(Role.ADMIN), controller.updatePermissionStatus);

  return router;
};
