import { Router } from 'express';
import { CameraController } from '../controllers/camera.controller';

export const createCameraRouter = (cameraController: CameraController): Router => {
  const router = Router();

  /**
   * @route   GET /api/v1/cameras/stream
   * @desc    Live video stream (MJPEG) with AI face recognition bounding boxes & employee names
   * @access  Public / Frontend / Mobile
   */
  router.get('/stream', cameraController.getStream);

  /**
   * @route   GET /api/v1/cameras/snapshot
   * @desc    Get single real-time snapshot frame
   * @access  Public / Frontend / Mobile
   */
  router.get('/snapshot', cameraController.getSnapshot);

  /**
   * @route   GET /api/v1/cameras/status
   * @desc    Get AI engine streaming metrics & status (FPS, detected faces)
   * @access  Public / Frontend / Mobile
   */
  router.get('/status', cameraController.getStatus);

  return router;
};
