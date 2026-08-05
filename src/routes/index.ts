import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../lib/prisma/client';
import { getRedisClient } from '../lib/redis/client';

// Repositories
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { UserRepository } from '../repositories/user.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { CctvRepository } from '../repositories/cctv.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';

// Services
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { ScheduleService } from '../services/schedule.service';
import { CctvService } from '../services/cctv.service';

// Controllers
import { AttendanceController } from '../controllers/attendance.controller';
import { EmployeeController } from '../controllers/employee.controller';
import { AuthController } from '../controllers/auth.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { CameraController } from '../controllers/camera.controller';
import { MobileController } from '../controllers/mobile.controller';
import { ScheduleController } from '../controllers/schedule.controller';
import { CctvController } from '../controllers/cctv.controller';

// Route factories
import { createAttendanceRouter } from './attendance.routes';
import { createEmployeeRouter } from './employee.routes';
import { createAuthRouter } from './auth.routes';
import { createDashboardRouter } from './dashboard.routes';
import { createCameraRouter } from './camera.routes';
import { createMobileRouter } from './mobile.routes';
import { createScheduleRouter } from './schedule.routes';
import { createCctvRouter } from './cctv.routes';

export const createRouter = (): Router => {
  const router = Router();

  // === Dependency Injection ===
  const prisma = getPrismaClient();
  const redis = getRedisClient();

  const attendanceRepository = new AttendanceRepository(prisma);
  const employeeRepository = new EmployeeRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const dashboardRepository = new DashboardRepository(prisma);
  const scheduleRepository = new ScheduleRepository(prisma);
  const cctvRepository = new CctvRepository(prisma);

  const attendanceService = new AttendanceService(
    attendanceRepository,
    employeeRepository,
    scheduleRepository,
    redis,
  );
  const employeeService = new EmployeeService(employeeRepository);
  const authService = new AuthService(userRepository);
  const dashboardService = new DashboardService(dashboardRepository);
  const scheduleService = new ScheduleService(scheduleRepository);
  const cctvService = new CctvService(cctvRepository);

  const attendanceController = new AttendanceController(attendanceService);
  const employeeController = new EmployeeController(employeeService);
  const authController = new AuthController(authService);
  const dashboardController = new DashboardController(dashboardService);
  const cameraController = new CameraController();
  const mobileController = new MobileController(employeeRepository, attendanceService, scheduleService);
  const scheduleController = new ScheduleController(scheduleService);
  const cctvController = new CctvController(cctvService);

  router.use('/attendance', createAttendanceRouter(attendanceController));
  router.use('/employees', createEmployeeRouter(employeeController));
  router.use('/auth', createAuthRouter(authController));
  router.use('/dashboard', createDashboardRouter(dashboardController));
  router.use('/cameras', createCameraRouter(cameraController));
  router.use('/mobile', createMobileRouter(mobileController));
  router.use('/schedules', createScheduleRouter(scheduleController));
  router.use('/cctv', createCctvRouter(cctvController));

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API berjalan',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};  