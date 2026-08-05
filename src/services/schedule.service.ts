import { WorkSchedule } from '@prisma/client';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { z } from 'zod';
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule.validator';

export class ScheduleService {
  constructor(private readonly repository: ScheduleRepository) { }

  async createSchedule(data: z.infer<typeof createScheduleSchema>): Promise<WorkSchedule> {
    const existing = await this.repository.findByCode(data.scheduleCode);
    if (existing) {
      throw new ConflictError(`Jadwal dengan kode ${data.scheduleCode} sudah ada`);
    }

    return this.repository.create(data);
  }

  async getAllSchedules(): Promise<WorkSchedule[]> {
    return this.repository.findAll();
  }

  async getScheduleByDay(day: string): Promise<WorkSchedule | null> {
    const schedules = await this.repository.findAll();
    const schedule = schedules.find(s => s.workDays.includes(day));
    return schedule || null;
  }

  async getScheduleById(id: string): Promise<WorkSchedule> {
    const schedule = await this.repository.findById(id);
    if (!schedule) {
      throw new NotFoundError('Jadwal tidak ditemukan');
    }
    return schedule;
  }

  async updateSchedule(id: string, data: z.infer<typeof updateScheduleSchema>): Promise<WorkSchedule> {
    await this.getScheduleById(id);

    if (data.scheduleCode) {
      const existing = await this.repository.findByCode(data.scheduleCode);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Jadwal dengan kode ${data.scheduleCode} sudah ada`);
      }
    }

    return this.repository.update(id, data);
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.getScheduleById(id);
    await this.repository.delete(id);
  }
}
