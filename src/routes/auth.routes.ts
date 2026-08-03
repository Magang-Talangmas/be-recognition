import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const createAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  /**
   * @route   POST /api/v1/auth/login
   * @desc    Login web client, mendapatkan JWT token
   * @access  Public
   */
  router.post('/login', authController.login);

  return router;
};
