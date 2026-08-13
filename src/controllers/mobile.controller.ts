import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmployeeRepository } from '../repositories/employee.repository';
import { AttendanceService } from '../services/attendance.service';
import { LiveMonitoringRepository } from '../repositories/live.repository';
import { mobileLoginSchema, deviceTokenSchema, changePasswordSchema } from '../validators/mobile.validator';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/http.constants';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';
import { logger } from '../config/logger';
import { JwtPayload } from '../interfaces/auth.interface';
import { uploadCheckinPhoto } from '../lib/storage';

const JWT_EXPIRY = '24h';

import { ScheduleService } from '../services/schedule.service';

export class MobileController {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly attendanceService: AttendanceService,
    private readonly scheduleService: ScheduleService,
    private readonly liveMonitoringRepository: LiveMonitoringRepository,
  ) { }

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = mobileLoginSchema.parse(req.body);
      const employee = await this.employeeRepository.findByEmail(data.email);

      if (!employee || employee.status !== 'Active' || !employee.password) {
        logger.warn('Percobaan login mobile dengan email tidak terdaftar/tidak aktif', {
          email: data.email,
        });
        throw new UnauthorizedError('Email atau password salah');
      }

      const isPasswordValid = await bcrypt.compare(data.password, employee.password);
      if (!isPasswordValid) {
        logger.warn('Percobaan login mobile dengan password salah', {
          employeeId: employee.employeeId,
        });
        throw new UnauthorizedError('Email atau password salah');
      }

      const payload: JwtPayload = {
        sub: employee.employeeId,
        email: employee.email,
        role: 'EMPLOYEE',
      };

      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login berhasil',
        data: {
          token,
          employee: {
            id: employee.id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
            photos: employee.photos,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const employee = await this.employeeRepository.findByEmployeeId(req.user.id);
      if (!employee) {
        throw new UnauthorizedError('Employee tidak ditemukan');
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profil berhasil diambil',
        data: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          faceRegistered: employee.faceRegistered,
          photos: employee.photos,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  checkIn = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const eventType = req.body.eventType || 'CHECK_IN';

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        throw new ValidationError('Foto selfie wajib diupload saat check-in');
      }
      const photoUrl = await uploadCheckinPhoto(files[0], req.user.id);

      const isLate = await this.attendanceService.processAttendance({
        externalEventId: `mobile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        employeeId: req.user.id,
        cameraId: 'mobile-app',
        eventType: eventType,
        similarity: undefined,
        timestamp: new Date().toISOString(),
        photoUrl,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Absensi berhasil dicatat',
        data: {
          eventType,
          isLate: eventType === 'CHECK_IN' ? (isLate ?? false) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.attendanceService.getAttendances({
        employeeId: req.user.id,
        page,
        limit,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Riwayat absensi berhasil diambil',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  updateDeviceToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const body = deviceTokenSchema.parse(req.body);

      const employee = await this.employeeRepository.findByEmployeeId(req.user.id);
      if (!employee) {
        throw new NotFoundError('Employee tidak ditemukan');
      }

      await this.employeeRepository.update(employee.id, {
        fcmToken: body.fcmToken,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Device token berhasil diperbarui',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  getTodaySchedule = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const employee = await this.employeeRepository.findByEmployeeId(req.user.id);
      let schedule = employee?.schedule || null;

      if (!schedule) {
        const formatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
        });
        const dayName = formatter.format(new Date());
        const currentDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        schedule = await this.scheduleService.getScheduleByDay(currentDay);
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Jadwal hari ini berhasil diambil',
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const data = changePasswordSchema.parse(req.body);

      const employee = await this.employeeRepository.findByEmployeeId(req.user.id);
      if (!employee) {
        throw new NotFoundError('Employee tidak ditemukan');
      }

      if (!employee.password) {
        throw new ValidationError('Password karyawan belum di-set');
      }

      const isPasswordValid = await bcrypt.compare(data.currentPassword, employee.password);
      if (!isPasswordValid) {
        throw new ValidationError('Password saat ini tidak sesuai');
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.employeeRepository.update(employee.id, {
        password: hashedPassword,
      });

      logger.info('Password employee berhasil diubah via mobile', {
        employeeId: employee.employeeId,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password berhasil diubah',
      });
    } catch (error) {
      next(error);
    }
  };

  confirmRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const recognitionId = req.params['id'] as string;
      const recognition = await this.liveMonitoringRepository.findRecognitionById(recognitionId);

      if (!recognition) {
        throw new NotFoundError('Data deteksi wajah tidak ditemukan');
      }

      if (recognition.employeeId !== req.user.id) {
        throw new UnauthorizedError('Anda tidak berhak mengonfirmasi data ini');
      }

      if ((recognition as any).isConfirm === 'CONFIRMED') {
        throw new ValidationError('Data ini sudah dikonfirmasi sebelumnya');
      }

      // Update status menjadi Verified dan isConfirm menjadi CONFIRMED
      await this.liveMonitoringRepository.updateRecognitionStatusAndConfirm(recognitionId, 'Verified', 'CONFIRMED');

      // Pindahkan ke tabel Attendances (via AttendanceService)
      const isLate = await this.attendanceService.processAttendance({
        externalEventId: recognition.id, // Gunakan ID recognition sebagai externalEventId
        employeeId: recognition.employeeId,
        cameraId: recognition.cameraId,
        eventType: 'CHECK_IN', // Default ke CHECK_IN (bisa diexpand dari request body jika diperlukan)
        similarity: recognition.confidence,
        timestamp: recognition.createdAt.toISOString(),
        photoUrl: recognition.thumbnail ?? undefined,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Konfirmasi berhasil, data telah masuk ke daftar absensi',
        data: {
          isLate: isLate ?? false,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  rejectRecognition = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        throw new UnauthorizedError('Akses ditolak');
      }

      const recognitionId = req.params['id'] as string;
      const recognition = await this.liveMonitoringRepository.findRecognitionById(recognitionId);

      if (!recognition) {
        throw new NotFoundError('Data deteksi wajah tidak ditemukan');
      }

      if (recognition.employeeId !== req.user.id) {
        throw new UnauthorizedError('Anda tidak berhak menolak data ini');
      }

      if ((recognition as any).isConfirm === 'CONFIRMED') {
        throw new ValidationError('Data ini sudah dikonfirmasi sebelumnya');
      }
      
      if ((recognition as any).isConfirm === 'REJECTED') {
        throw new ValidationError('Data ini sudah ditolak sebelumnya');
      }

      // Update status menjadi Rejected dan isConfirm menjadi REJECTED
      await this.liveMonitoringRepository.updateRecognitionStatusAndConfirm(recognitionId, 'Rejected', 'REJECTED');

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Data deteksi berhasil ditolak',
      });
    } catch (error) {
      next(error);
    }
  };
}
