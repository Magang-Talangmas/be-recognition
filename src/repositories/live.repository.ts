import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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
      ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter.isConfirm ? { isConfirm: filter.isConfirm } : {}),
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

  async findEmployeeFcmToken(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      select: { fcmToken: true },
    });
    return employee?.fcmToken ?? null;
  }

  /**
   * Cari record recognition_events untuk employeeId pada hari yang sama (WIB).
   * Hanya cek record dengan status 'Unknown' atau 'Verified' (Rejected boleh POST ulang).
   * Return null jika tidak ada duplikat.
   */
  async findTodayRecognitionByEmployee(
    employeeId: string | null,
    date: Date,
    eventType?: string,
  ): Promise<RecognitionEvent | null> {
    const startOfDay = dayjs(date).tz('Asia/Jakarta').startOf('day').toDate();
    const endOfDay   = dayjs(date).tz('Asia/Jakarta').endOf('day').toDate();

    return this.prisma.recognitionEvent.findFirst({
      where: {
        employeeId,
        eventType,
        status: { in: ['Unknown', 'Verified'] },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateThumbnail(id: string, thumbnail: string | null): Promise<void> {
    await this.prisma.recognitionEvent.update({
      where: { id },
      data: { thumbnail },
    });
  }

  async findRecognitionById(id: string): Promise<RecognitionEvent | null> {
    return this.prisma.recognitionEvent.findUnique({ where: { id } });
  }

  async updateRecognitionConfirm(id: string, isConfirm: string): Promise<RecognitionEvent> {
    return this.prisma.recognitionEvent.update({
      where: { id },
      data: { isConfirm: isConfirm },
    });
  }

  async updateRecognitionStatusAndConfirm(id: string, status: string, isConfirm: string): Promise<RecognitionEvent> {
    return this.prisma.recognitionEvent.update({
      where: { id },
      data: { status, isConfirm: isConfirm },
    });
  }

  async updateRecognitionForUpsert(id: string, data: { confidence: number, thumbnail: string | null, createdAt: Date }): Promise<RecognitionEvent> {
    return this.prisma.recognitionEvent.update({
      where: { id },
      data,
    });
  }
}

