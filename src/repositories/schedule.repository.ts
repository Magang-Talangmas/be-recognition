import { Prisma, PrismaClient, WorkSchedule } from '@prisma/client';

export class ScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.WorkScheduleCreateInput): Promise<WorkSchedule> {
    return this.prisma.workSchedule.create({
      data,
    });
  }

  async findAll(): Promise<WorkSchedule[]> {
    return this.prisma.workSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<WorkSchedule | null> {
    return this.prisma.workSchedule.findUnique({
      where: { id },
    });
  }

  async findByCode(scheduleCode: string): Promise<WorkSchedule | null> {
    return this.prisma.workSchedule.findUnique({
      where: { scheduleCode },
    });
  }

  async findByDay(dayName: string): Promise<WorkSchedule | null> {
    return this.prisma.workSchedule.findFirst({
      where: {
        workDays: {
          has: dayName,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.WorkScheduleUpdateInput): Promise<WorkSchedule> {
    return this.prisma.workSchedule.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<WorkSchedule> {
    return this.prisma.workSchedule.delete({
      where: { id },
    });
  }
}
