import { Router } from 'express';
import { CctvController } from '../controllers/cctv.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createCctvRouter = (cctvController: CctvController): Router => {
  const router = Router();

  /**
   * @route   GET /api/v1/cctv?search=&status=&page=&per_page=
   * @desc    Daftar CCTV dengan filter & pagination
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/', authMiddleware, cctvController.getCctvs);

  /**
   * @route   POST /api/v1/cctv
   * @desc    Buat CCTV baru (cameraId di-generate server)
   * @access  Web Client / Mobile (JWT)
   */
  router.post('/', authMiddleware, cctvController.createCctv);

  /**
   * @route   GET /api/v1/cctv/:id
   * @desc    Detail CCTV berdasarkan ID
   * @access  Web Client / Mobile (JWT)
   */
  router.get('/:id', authMiddleware, cctvController.getCctvById);

  /**
   * @route   PUT /api/v1/cctv/:id
   * @desc    Update CCTV (partial, cameraId tidak bisa diubah)
   * @access  Web Client / Mobile (JWT)
   */
  router.put('/:id', authMiddleware, cctvController.updateCctv);

  /**
   * @route   PATCH /api/v1/cctv/:id/status
   * @desc    Toggle status online (heartbeat ML server / admin)
   * @access  Web Client / Mobile (JWT)
   */
  router.patch('/:id/status', authMiddleware, cctvController.toggleStatus);

  /**
   * @route   PATCH /api/v1/cctv/:id/enabled
   * @desc    Toggle enabled
   * @access  Web Client / Mobile (JWT)
   */
  router.patch('/:id/enabled', authMiddleware, cctvController.toggleEnabled);

  /**
   * @route   DELETE /api/v1/cctv/:id
   * @desc    Hapus CCTV (hard delete, attendance.cameraId tetap string)
   * @access  Web Client / Mobile (JWT)
   */
  router.delete('/:id', authMiddleware, cctvController.deleteCctv);

  return router;
};
