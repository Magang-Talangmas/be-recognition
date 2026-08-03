import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { apiKeyMiddleware } from '../middlewares/apiKey.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createAttendanceRouter = (
  attendanceController: AttendanceController,
): Router => {
  const router = Router();

  /**
   * @route   POST /api/v1/attendance
   * @desc    Terima hasil deteksi wajah dari ML server
   * @access  ML (API Key)
   */
  router.post('/', apiKeyMiddleware, attendanceController.processAttendance);

  /**
   * @route   GET /api/v1/attendance
   * @desc    Daftar attendance (dengan filter & pagination)
   * @access  Web Client (JWT)
   */
  router.get('/', authMiddleware, attendanceController.getAttendances);

  /**
   * @route   GET /api/v1/attendance/:id
   * @desc    Detail attendance berdasarkan ID
   * @access  Web Client (JWT)
   */
  router.get('/:id', authMiddleware, attendanceController.getAttendanceById);

  return router;
};
