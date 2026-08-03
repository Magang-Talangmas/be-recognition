import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

export const createEmployeeRouter = (
  employeeController: EmployeeController,
): Router => {
  const router = Router();

  // Semua route employee memerlukan autentikasi JWT
  router.use(authMiddleware);

  /**
   * @route   GET /api/v1/employees
   * @desc    Daftar semua employee (paginated)
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
   * @desc    Buat employee baru
   * @access  JWT (ADMIN only)
   */
  router.post('/', requireRole(Role.ADMIN), employeeController.createEmployee);

  /**
   * @route   PATCH /api/v1/employees/:id
   * @desc    Update employee
   * @access  JWT (ADMIN only)
   */
  router.patch('/:id', requireRole(Role.ADMIN), employeeController.updateEmployee);

  /**
   * @route   DELETE /api/v1/employees/:id
   * @desc    Soft delete employee
   * @access  JWT (ADMIN only)
   */
  router.delete('/:id', requireRole(Role.ADMIN), employeeController.deleteEmployee);

  return router;
};
