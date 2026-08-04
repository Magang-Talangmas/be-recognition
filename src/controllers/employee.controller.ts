import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
} from '../validators/employee.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { EmployeeResponseItem } from '../interfaces/employee.interface';

export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  createEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = createEmployeeSchema.parse(req.body);
      const photoUrls = req.uploadedPhotos ?? [];

      const employee = await this.employeeService.createEmployee(body, photoUrls);

      const response: ApiSuccessResponse<EmployeeResponseItem> = {
        success: true,
        message: 'Karyawan berhasil ditambahkan',
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
      const result = await this.employeeService.getEmployees(filter);

      const response = {
        success: true,
        message: 'Berhasil mengambil daftar karyawan',
        data: result,
      };

      res.status(HTTP_STATUS.OK).json(response);
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
      const employee = await this.employeeService.getEmployeeById(id);

      const response: ApiSuccessResponse<EmployeeResponseItem> = {
        success: true,
        message: 'Berhasil mengambil detail karyawan',
        data: employee,
      };

      res.status(HTTP_STATUS.OK).json(response);
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
      const photoUrls = req.uploadedPhotos ?? [];

      const employee = await this.employeeService.updateEmployee(id, body, photoUrls);

      const response: ApiSuccessResponse<EmployeeResponseItem> = {
        success: true,
        message: 'Karyawan berhasil diperbarui',
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

      const response: ApiSuccessResponse<EmployeeResponseItem> = {
        success: true,
        message: 'Status karyawan diubah',
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

      const response: ApiSuccessResponse<EmployeeResponseItem> = {
        success: true,
        message: 'Status wajah diubah',
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

      const response: ApiSuccessResponse<null> = {
        success: true,
        message: 'Karyawan berhasil dihapus',
        data: null,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}