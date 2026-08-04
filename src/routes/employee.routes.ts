import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { uploadPhotos } from '../middlewares/upload.middleware';
import { Role } from '@prisma/client';

export const createEmployeeRouter = (
  employeeController: EmployeeController,
): Router => {
  const router = Router();

  // Semua route employee memerlukan autentikasi JWT
  router.use(authMiddleware);

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.get('/', employeeController.getEmployees);

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.get('/:id', employeeController.getEmployeeById);

  /**
   * @route   POST /api/v1/employees
   * @desc    Tambah karyawan baru (multipart/form-data dengan photos)
   * @access  JWT (ADMIN only)
   */
  router.post(
    '/',
    requireRole(Role.ADMIN),
    uploadPhotos,
    employeeController.createEmployee,
  );

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.put(
    '/:id',
    requireRole(Role.ADMIN),
    uploadPhotos,
    employeeController.updateEmployee,
  );

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.patch(
    '/:id/status',
    requireRole(Role.ADMIN),
    employeeController.toggleStatus,
  );

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.patch(
    '/:id/face',
    requireRole(Role.ADMIN),
    employeeController.toggleFace,
  );

  /**
   * @route   
   * @desc    
   * @access  
   */
  router.delete('/:id', requireRole(Role.ADMIN), employeeController.deleteEmployee);

  return router;
};