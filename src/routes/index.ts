import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../lib/prisma/client';
import { getRedisClient } from '../lib/redis/client';

// Repositories
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { UserRepository } from '../repositories/user.repository';

// Services
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { AuthService } from '../services/auth.service';

// Controllers
import { AttendanceController } from '../controllers/attendance.controller';
import { EmployeeController } from '../controllers/employee.controller';
import { AuthController } from '../controllers/auth.controller';

// Route factories
import { createAttendanceRouter } from './attendance.routes';
import { createEmployeeRouter } from './employee.routes';
import { createAuthRouter } from './auth.routes';

export const createRouter = (): Router => {
  const router = Router();

  // === Dependency Injection ===
  const prisma = getPrismaClient();
  const redis = getRedisClient();

  // Repositories (shared dependencies pertama)
  const attendanceRepository = new AttendanceRepository(prisma);
  const employeeRepository = new EmployeeRepository(prisma);
  const userRepository = new UserRepository(prisma);

  // Services
  const attendanceService = new AttendanceService(
    attendanceRepository,
    employeeRepository,
    redis,
  );
  const employeeService = new EmployeeService(employeeRepository);
  const authService = new AuthService(userRepository);

  // Controllers
  const attendanceController = new AttendanceController(attendanceService);
  const employeeController = new EmployeeController(employeeService);
  const authController = new AuthController(authService);

  // === Mount Routes ===
  router.use('/attendance', createAttendanceRouter(attendanceController));
  router.use('/employees', createEmployeeRouter(employeeController));
  router.use('/auth', createAuthRouter(authController));

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API berjalan',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
