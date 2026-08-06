import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';
import {
  createPermissionSchema,
  permissionQuerySchema,
  updatePermissionStatusSchema,
} from '../validators/permission.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ValidationError } from '../errors/ValidationError';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { PermissionDTO, PermissionList } from '../interfaces/permission.interface';

export class PermissionController {
  constructor(private readonly service: PermissionService) {}

  createPermission = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = createPermissionSchema.parse(req.body);
      const file = (req.file as Express.Multer.File | undefined);
      const isAdmin = req.user?.role === 'ADMIN';

      const employeeId = isAdmin ? body.employeeId : req.user!.id;
      if (!employeeId) {
        throw new ValidationError('employeeId wajib diisi');
      }

      const data = await this.service.createPermission(
        { ...body, employeeId },
        file,
        isAdmin,
      );

      const response: ApiSuccessResponse<PermissionDTO> = {
        success: true,
        message:
          data.status === 'APPROVED'
            ? 'Izin berhasil diajukan dan disetujui'
            : 'Izin berhasil diajukan, menunggu persetujuan',
        data,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = permissionQuerySchema.parse(req.query);
      const data = await this.service.getPermissions(filter);

      const response: ApiSuccessResponse<PermissionList> = {
        success: true,
        message: 'Berhasil mengambil daftar izin',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  updatePermissionStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const body = updatePermissionStatusSchema.parse(req.body);

      const data = await this.service.updateStatus(id, body.status);

      const response: ApiSuccessResponse<PermissionDTO> = {
        success: true,
        message: `Status izin berhasil diubah menjadi ${body.status}`,
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
