import { Settings } from '@prisma/client';
import { SettingsRepository } from '../repositories/settings.repository';
import { UpdateSettingsInput } from '../validators/settings.validator';

export const DEFAULT_SETTINGS = {
  notifUnregistered: true,
  notifCctvOffline: true,
  notifMissingCheckIn: true,
  trackPauseAuto: true,
} as const;

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async getSettings(): Promise<Settings> {
    return this.repository.getOrCreate();
  }

  async updateSettings(data: UpdateSettingsInput): Promise<Settings> {
    return this.repository.update(data);
  }

  async resetSettings(): Promise<Settings> {
    return this.repository.update({ ...DEFAULT_SETTINGS });
  }
}
