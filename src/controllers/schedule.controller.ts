import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule.validator';

export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  createSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = createScheduleSchema.parse(req.body);
      const schedule = await this.service.createSchedule(parsedData);
      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Jadwal berhasil ditambahkan',
      });
    } catch (error) {
      next(error);
    }
  };

  getAllSchedules = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = await this.service.getAllSchedules();
      res.json({
        success: true,
        data: schedules,
      });
    } catch (error) {
      next(error);
    }
  };

  getScheduleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await this.service.getScheduleById(req.params.id as string);
      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = updateScheduleSchema.parse(req.body);
      const schedule = await this.service.updateSchedule(req.params.id as string, parsedData);
      res.json({
        success: true,
        data: schedule,
        message: 'Jadwal berhasil diperbarui',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteSchedule(req.params.id as string);
      res.json({
        success: true,
        message: 'Jadwal berhasil dihapus',
      });
    } catch (error) {
      next(error);
    }
  };
}
