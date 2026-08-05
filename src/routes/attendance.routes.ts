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
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/', authMiddleware, attendanceController.getAttendances);

  /**
   * @route   GET /api/v1/attendance/daily?date=YYYY-MM-DD
   * @desc    Daftar kehadiran harian semua employee (aktif paling atas) + status hadir/absen
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/daily', authMiddleware, attendanceController.getDailyAttendance);

  /**
   * @route   GET /api/v1/attendance/:id
   * @desc    Detail attendance berdasarkan ID
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/:id', authMiddleware, attendanceController.getAttendanceById);

  /**
   * @route   PATCH /api/v1/attendance/:id/status
   * @desc    Update status konfirmasi absensi (PENDING / CONFIRMED / REJECTED)
   * @access  Web Client / Mobile (JWT)
   */
  router.patch('/:id/status', authMiddleware, attendanceController.updateConfirmationStatus);

  return router;
};
