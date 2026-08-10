import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../lib/prisma/client';
import { getRedisClient } from '../lib/redis/client';
import { env } from '../config/env';

// Repositories
import { AttendanceRepository } from '../repositories/attendance.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { UserRepository } from '../repositories/user.repository';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { CctvRepository } from '../repositories/cctv.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { ReportRepository } from '../repositories/report.repository';
import { LiveMonitoringRepository } from '../repositories/live.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { SettingsRepository } from '../repositories/settings.repository';
import { PermissionRepository } from '../repositories/permission.repository';

// Services
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { ScheduleService } from '../services/schedule.service';
import { CctvService } from '../services/cctv.service';
import { ReportService } from '../services/report.service';
import { LiveMonitoringService } from '../services/live.service';
import { MlDetectService } from '../services/ml-detect.service';
import { MlRegisterService } from '../services/ml-register.service';
import { NotificationService } from '../services/notification.service';
import { SettingsService } from '../services/settings.service';
import { PermissionService } from '../services/permission.service';
import { ScheduleReminderService } from '../services/schedule-reminder.service';

// Controllers
import { AttendanceController } from '../controllers/attendance.controller';
import { EmployeeController } from '../controllers/employee.controller';
import { AuthController } from '../controllers/auth.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { CameraController } from '../controllers/camera.controller';
import { MobileController } from '../controllers/mobile.controller';
import { ScheduleController } from '../controllers/schedule.controller';
import { CctvController } from '../controllers/cctv.controller';
import { ReportController } from '../controllers/report.controller';
import { LiveMonitoringController } from '../controllers/live.controller';
import { NotificationController } from '../controllers/notification.controller';
import { SettingsController } from '../controllers/settings.controller';
import { PermissionController } from '../controllers/permission.controller';

// Route factories
import { createAttendanceRouter } from './attendance.routes';
import { createEmployeeRouter } from './employee.routes';
import { createAuthRouter } from './auth.routes';
import { createDashboardRouter } from './dashboard.routes';
import { createCameraRouter } from './camera.routes';
import { createMobileRouter } from './mobile.routes';
import { createScheduleRouter } from './schedule.routes';
import { createCctvRouter } from './cctv.routes';
import { createReportRouter } from './report.routes';
import { createLiveRouter } from './live.routes';
import { createEmployeeDetailRouter } from './employee.routes';
import { createSettingsRouter } from './settings.routes';
import { createPermissionRouter } from './permission.routes';

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
  const reportRepository = new ReportRepository(prisma);
  const liveMonitoringRepository = new LiveMonitoringRepository(prisma);
  const notificationRepository = new NotificationRepository(prisma);
  const settingsRepository = new SettingsRepository(prisma);
  const permissionRepository = new PermissionRepository(prisma);

  const attendanceService = new AttendanceService(
    attendanceRepository,
    employeeRepository,
    scheduleRepository,
    redis,
    liveMonitoringRepository,
  );
  const employeeService = new EmployeeService(
    employeeRepository,
    new MlRegisterService(),
  );
  const authService = new AuthService(userRepository);
  const dashboardService = new DashboardService(dashboardRepository);
  const scheduleService = new ScheduleService(scheduleRepository);
  const cctvService = new CctvService(cctvRepository);
  const reportService = new ReportService(reportRepository);
  const liveMonitoringService = new LiveMonitoringService(liveMonitoringRepository);
  const mlDetectService = new MlDetectService(liveMonitoringService);
  if (env.NODE_ENV !== 'test') {
    mlDetectService.start();
  }
  const notificationService = new NotificationService(notificationRepository);
  const settingsService = new SettingsService(settingsRepository);
  const permissionService = new PermissionService(
    permissionRepository,
    employeeRepository,
    notificationRepository,
  );

  const scheduleReminderService = new ScheduleReminderService(
    employeeRepository,
    attendanceRepository,
    permissionRepository,
    notificationRepository,
    settingsRepository,
  );
  if (env.NODE_ENV !== 'test') {
    scheduleReminderService.start();
  }

  const attendanceController = new AttendanceController(attendanceService);
  const employeeController = new EmployeeController(
    employeeService,
    reportService,
  );
  const authController = new AuthController(authService);
  const dashboardController = new DashboardController(dashboardService);
  const cameraController = new CameraController();
  const mobileController = new MobileController(employeeRepository, attendanceService, scheduleService);
  const scheduleController = new ScheduleController(scheduleService);
  const cctvController = new CctvController(cctvService);
  const reportController = new ReportController(reportService);
  const liveMonitoringController = new LiveMonitoringController(liveMonitoringService);
  const notificationController = new NotificationController(notificationService);
  const settingsController = new SettingsController(settingsService);
  const permissionController = new PermissionController(permissionService);

  router.use('/attendance/permissions', createPermissionRouter(permissionController));
  router.use('/attendance', createAttendanceRouter(attendanceController));
  router.use('/employees', createEmployeeRouter(employeeController));
  router.use('/employee', createEmployeeDetailRouter(employeeController));
  router.use('/reports', createReportRouter(reportController));
  router.use('/auth', createAuthRouter(authController));
  router.use('/dashboard', createDashboardRouter(dashboardController));
  router.use('/cameras', createCameraRouter(cameraController));
  router.use('/mobile', createMobileRouter(mobileController, notificationController));
  router.use('/schedules', createScheduleRouter(scheduleController));
  router.use('/cctv', createCctvRouter(cctvController));
  router.use('/live', createLiveRouter(liveMonitoringController));
  router.use('/settings', createSettingsRouter(settingsController));

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API berjalan',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};  