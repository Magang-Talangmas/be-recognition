import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { reportQuerySchema } from '../validators/report.validator';
import { HTTP_STATUS } from '../constants/http.constants';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { ReportResult } from '../interfaces/report.interface';

export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  getReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = reportQuerySchema.parse(req.query);
      const data = await this.reportService.getReport(query);

      const response: ApiSuccessResponse<ReportResult> = {
        success: true,
        message: 'Report berhasil diambil',
        data,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
