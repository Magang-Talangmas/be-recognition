import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { uploadPhotos } from '../lib/upload/upload';

export const createEmployeeRouter = (
  employeeController: EmployeeController,
): Router => {
  const router = Router();

  // Semua route employee memerlukan autentikasi JWT
  router.use(authMiddleware);

  /**
   * @route   GET /api/v1/employees
   * @desc    Daftar employee (paginated, filter search/department/status)
   * @access  JWT (ADMIN, VIEWER)
   */
  router.get('/', employeeController.getEmployees);

  /**
   * @route   GET /api/v1/employees/:id
   * @desc    Detail employee
   * @access  JWT (ADMIN, VIEWER)
   */
  router.get('/:id', employeeController.getEmployeeById);

  /**
   * @route   POST /api/v1/employees
   * @desc    Buat employee baru (multipart, photos ≤3, tiap ≤10MB)
   * @access  JWT (ADMIN only)
   */
  router.post('/', requireRole(Role.ADMIN), uploadPhotos, employeeController.createEmployee);

  /**
   * @route   PUT /api/v1/employees/:id
   * @desc    Update employee (multipart, semua field opsional)
   * @access  JWT (ADMIN only)
   */
  router.put('/:id', requireRole(Role.ADMIN), uploadPhotos, employeeController.updateEmployee);

  /**
   * @route   PATCH /api/v1/employees/:id/status
   * @desc    Toggle aktif/nonaktif
   * @access  JWT (ADMIN only)
   */
  router.patch('/:id/status', requireRole(Role.ADMIN), employeeController.toggleStatus);

  /**
   * @route   PATCH /api/v1/employees/:id/face
   * @desc    Toggle status wajah
   * @access  JWT (ADMIN only)
   */
  router.patch('/:id/face', requireRole(Role.ADMIN), employeeController.toggleFace);

  /**
   * @route   DELETE /api/v1/employees/:id
   * @desc    Soft delete employee
   * @access  JWT (ADMIN only)
   */
  router.delete('/:id', requireRole(Role.ADMIN), employeeController.deleteEmployee);

  return router;
};