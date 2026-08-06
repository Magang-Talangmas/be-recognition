import { Request, Response, NextFunction } from 'express';
import { EmployeeService, EmployeeDTO } from '../services/employee.service';
import { ReportService } from '../services/report.service';
import { NotFoundError } from '../errors/NotFoundError';
import { ReportPeriodDetail } from '../interfaces/report.interface';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
} from '../validators/employee.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { uploadEmployeePhotos } from '../lib/storage';

function getUploadedFiles(req: Request): Express.Multer.File[] {
  return (req.files as Express.Multer.File[] | undefined) ?? [];
}

const PERIOD_CODE_PATTERN = /^\d{4}-\d{2}(-\d{2})?$/;

export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly reportService: ReportService,
  ) {}

  createEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = createEmployeeSchema.parse(req.body);
      const photos = await uploadEmployeePhotos(getUploadedFiles(req));
      const employee = await this.employeeService.createEmployee({
        ...body,
        photos,
      });

      const response: ApiSuccessResponse<EmployeeDTO> = {
        success: true,
        message: 'Employee berhasil dibuat',
        data: employee,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };

  getEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = employeeFilterSchema.parse(req.query);
      const data = await this.employeeService.getEmployees(filter);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Berhasil mengambil daftar employee',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployeeById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;

      try {
        const employee = await this.employeeService.getEmployeeById(id);

        const response: ApiSuccessResponse<EmployeeDTO> = {
          success: true,
          message: 'Berhasil mengambil detail employee',
          data: employee,
        };

        res.status(HTTP_STATUS.OK).json(response);
        return;
      } catch (error) {
        if (
          error instanceof NotFoundError &&
          PERIOD_CODE_PATTERN.test(id)
        ) {
          const period = await this.reportService.getPeriodDetail(id);

          const response: ApiSuccessResponse<ReportPeriodDetail> = {
            success: true,
            message: 'Detail periode berhasil diambil',
            data: period,
          };

          res.status(HTTP_STATUS.OK).json(response);
          return;
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  };

  updateEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const body = updateEmployeeSchema.parse(req.body);
      const newPhotos = getUploadedFiles(req);
      const photos =
        newPhotos.length > 0 ? await uploadEmployeePhotos(newPhotos) : undefined;

      const employee = await this.employeeService.updateEmployee(id, {
        ...body,
        ...(photos && { photos }),
      });

      const response: ApiSuccessResponse<EmployeeDTO> = {
        success: true,
        message: 'Employee berhasil diperbarui',
        data: employee,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  toggleStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const employee = await this.employeeService.toggleStatus(id);

      const response: ApiSuccessResponse<EmployeeDTO> = {
        success: true,
        message: 'Status employee berhasil diubah',
        data: employee,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  toggleFace = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const employee = await this.employeeService.toggleFace(id);

      const response: ApiSuccessResponse<EmployeeDTO> = {
        success: true,
        message: 'Status wajah employee berhasil diubah',
        data: employee,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      await this.employeeService.deleteEmployee(id);

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}