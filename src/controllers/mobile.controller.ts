import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmployeeRepository } from '../repositories/employee.repository';
import { AttendanceService } from '../services/attendance.service';
import { mobileLoginSchema, deviceTokenSchema } from '../validators/mobile.validator';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/http.constants';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { logger } from '../config/logger';
import { JwtPayload } from '../interfaces/auth.interface';

const JWT_EXPIRY = '24h';

export class MobileController {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly attendanceService: AttendanceService,
  ) {}

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

      const employee = await this.employeeRepository.findById(req.user.id);
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

      await this.attendanceService.processAttendance({
        externalEventId: `mobile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        employeeId: req.user.id,
        cameraId: 'mobile-app',
        eventType: eventType,
        similarity: undefined,
        timestamp: new Date().toISOString(),
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Absensi berhasil dicatat',
        data: null,
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
      
      await this.employeeRepository.update(req.user.id, {
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
}
