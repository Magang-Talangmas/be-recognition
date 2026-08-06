import { Prisma, PrismaClient, Settings } from '@prisma/client';

const SETTINGS_ID = 'system';

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreate(): Promise<Settings> {
    return this.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: {},
    });
  }

  async update(data: Prisma.SettingsUncheckedUpdateInput): Promise<Settings> {
    await this.getOrCreate();
    return this.prisma.settings.update({
      where: { id: SETTINGS_ID },
      data,
    });
  }
}
