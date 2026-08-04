import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import {
  DashboardSummary,
  RecentActivityItem,
} from '../interfaces/dashboard.interface';

const RECENT_ACTIVITY_LIMIT = 20;

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  getSummary = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getSummary();

      const response: ApiSuccessResponse<DashboardSummary> = {
        success: true,
        message: 'Dashboard summary berhasil diambil',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  getRecentActivity = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await this.dashboardService.getRecentActivity(
        RECENT_ACTIVITY_LIMIT,
      );

      const response: ApiSuccessResponse<RecentActivityItem[]> = {
        success: true,
        message: 'Aktivitas terbaru berhasil diambil',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}