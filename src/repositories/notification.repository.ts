import { Prisma, PrismaClient, Notification } from '@prisma/client';

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findByEmployeeId(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Notification[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      OR: [
        { employeeId: employeeId },
        {
          attendance: {
            employeeId: employeeId,
          },
        },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          attendance: {
            select: {
              id: true,
              eventType: true,
              timestamp: true,
              isLate: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        attendance: true,
      },
    });
  }

  /**
   * Cari reminder absen yang sudah dikirim ke sekumpulan employee pada rentang waktu tertentu.
   * Dipakai sebagai dedup agar notifikasi H-10 / H+5 tidak terkirim berulang-ulang.
   */
  async findRemindersForEmployees(
    employeeIds: string[],
    types: string[],
    start: Date,
    end: Date,
  ): Promise<{ employeeId: string | null; type: string }[]> {
    return this.prisma.notification.findMany({
      where: {
        employeeId: { in: employeeIds },
        type: { in: types },
        createdAt: { gte: start, lt: end },
      },
      select: { employeeId: true, type: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
