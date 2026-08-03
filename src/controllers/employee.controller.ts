import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
} from '../validators/employee.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { Employee } from '@prisma/client';

export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  createEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = createEmployeeSchema.parse(req.body);
      const employee = await this.employeeService.createEmployee(body);

      const response: ApiSuccessResponse<Employee> = {
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
      const result = await this.employeeService.getEmployees(filter);

      const response = {
        success: true,
        message: 'Berhasil mengambil daftar employee',
        data: result.data,
        pagination: result.pagination,
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

      const response: ApiSuccessResponse<Employee> = {
        success: true,
        message: 'Berhasil mengambil detail employee',
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
      const employee = await this.employeeService.updateEmployee(id, body);

      const response: ApiSuccessResponse<Employee> = {
        success: true,
        message: 'Employee berhasil diperbarui',
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
