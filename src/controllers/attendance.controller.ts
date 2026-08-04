import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import {
  attendanceBodySchema,
  attendanceFilterSchema,
  updateConfirmationStatusSchema,
} from '../validators/attendance.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { AttendanceWithEmployee } from '../interfaces/attendance.interface';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  processAttendance = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = attendanceBodySchema.parse(req.body);

      await this.attendanceService.processAttendance({
        externalEventId: body.event_id,
        employeeId: body.employee_id,
        cameraId: body.camera_id ?? (process.env['DEFAULT_CAMERA_ID'] ?? 'unknown'),
        eventType: body.event_type,
        similarity: body.similarity,
        timestamp: body.detected_at,
      });

      const response: ApiSuccessResponse<null> = {
        success: true,
        message: 'OK',
        data: null,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAttendances = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = attendanceFilterSchema.parse(req.query);

      const result = await this.attendanceService.getAttendances({
        employeeId: filter.employee_id,
        eventType: filter.event_type,
        confirmationStatus: filter.confirmation_status,
        startDate: filter.start_date ? new Date(filter.start_date) : undefined,
        endDate: filter.end_date ? new Date(filter.end_date) : undefined,
        page: filter.page,
        limit: filter.limit,
      });

      const response = {
        success: true,
        message: 'Berhasil mengambil data attendance',
        data: result.data,
        pagination: result.pagination,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  getAttendanceById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const attendance = await this.attendanceService.getAttendanceById(id);

      const response: ApiSuccessResponse<AttendanceWithEmployee> = {
        success: true,
        message: 'Berhasil mengambil detail attendance',
        data: attendance,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateConfirmationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const body = updateConfirmationStatusSchema.parse(req.body);

      const updated = await this.attendanceService.updateConfirmationStatus(
        id,
        body.status,
      );

      const response: ApiSuccessResponse<AttendanceWithEmployee> = {
        success: true,
        message: `Status absensi berhasil diubah menjadi ${body.status}`,
        data: updated,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
