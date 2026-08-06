import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { updateSettingsSchema } from '../validators/settings.validator';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.service.getSettings();
      res.json({
        success: true,
        message: 'Pengaturan sistem',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = updateSettingsSchema.parse(req.body);
      const settings = await this.service.updateSettings(parsedData);
      res.json({
        success: true,
        message: 'Pengaturan berhasil disimpan',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  resetSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.service.resetSettings();
      res.json({
        success: true,
        message: 'Pengaturan berhasil direset',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };
}
