import { PrismaClient, Camera, Notification, RecognitionEvent, Prisma } from '@prisma/client';
import {
  NotificationFilter,
  RecognitionFilter,
} from '../interfaces/live.interface';

export interface LiveRows<T> {
  items: T[];
  total: number;
}

export class LiveMonitoringRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findFeeds(): Promise<Camera[]> {
    return this.prisma.camera.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findRecognitions(filter: RecognitionFilter): Promise<LiveRows<RecognitionEvent>> {
    const where = {
      ...(filter.cameraId ? { cameraId: filter.cameraId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.recognitionEvent.findMany({
        where,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recognitionEvent.count({ where }),
    ]);

    return { items, total };
  }

  async findNotifications(filter: NotificationFilter): Promise<LiveRows<Notification>> {
    const where = {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.read !== undefined ? { isRead: filter.read } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async createRecognition(
    data: Prisma.RecognitionEventUncheckedCreateInput,
  ): Promise<RecognitionEvent> {
    return this.prisma.recognitionEvent.create({ data });
  }

  async createNotification(
    data: Prisma.NotificationUncheckedCreateInput,
  ): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  async findNotificationById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markNotificationRead(id: string): Promise<Notification | null> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async findCameraByCameraId(cameraId: string): Promise<Camera | null> {
    return this.prisma.camera.findUnique({ where: { cameraId } });
  }

  async findEmployeeNameByEmployeeId(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      select: { name: true },
    });
    return employee?.name ?? null;
  }
}
