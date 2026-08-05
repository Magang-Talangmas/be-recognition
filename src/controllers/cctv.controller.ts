import { Request, Response, NextFunction } from 'express';
import { CctvService } from '../services/cctv.service';
import {
  createCctvSchema,
  updateCctvSchema,
  cctvFilterSchema,
  parseAsUnprocessable,
} from '../validators/cctv.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { CctvDTO } from '../interfaces/cctv.interface';

export class CctvController {
  constructor(private readonly cctvService: CctvService) {}

  createCctv = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = parseAsUnprocessable(createCctvSchema, req.body);
      const cctv = await this.cctvService.createCctv(body);

      const response: ApiSuccessResponse<CctvDTO> = {
        success: true,
        message: 'CCTV berhasil dibuat',
        data: cctv,
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };

  getCctvs = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filter = parseAsUnprocessable(cctvFilterSchema, req.query);
      const data = await this.cctvService.getCctvs(filter);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Berhasil mengambil daftar CCTV',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getCctvById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const cctv = await this.cctvService.getCctvById(id);

      const response: ApiSuccessResponse<CctvDTO> = {
        success: true,
        message: 'Berhasil mengambil detail CCTV',
        data: cctv,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateCctv = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const body = parseAsUnprocessable(updateCctvSchema, req.body);
      const cctv = await this.cctvService.updateCctv(id, body);

      const response: ApiSuccessResponse<CctvDTO> = {
        success: true,
        message: 'CCTV berhasil diperbarui',
        data: cctv,
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
      const cctv = await this.cctvService.toggleStatus(id);

      const response: ApiSuccessResponse<CctvDTO> = {
        success: true,
        message: 'Status online CCTV berhasil diubah',
        data: cctv,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  toggleEnabled = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const cctv = await this.cctvService.toggleEnabled(id);

      const response: ApiSuccessResponse<CctvDTO> = {
        success: true,
        message: 'Status enabled CCTV berhasil diubah',
        data: cctv,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteCctv = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      await this.cctvService.deleteCctv(id);

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
