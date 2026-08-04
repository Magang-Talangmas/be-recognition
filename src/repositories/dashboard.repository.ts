import { PrismaClient, AttendanceStatus } from '@prisma/client';
import {
  CameraFeedItem,
  CameraWithStatus,
  RecentActivityItem,
} from '../interfaces/dashboard.interface';

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countActiveEmployees(): Promise<number> {
    return this.prisma.employee.count({ where: { isActive: true } });
  }

  async countCameras(): Promise<{ online: number; offline: number }> {
    const [online, offline] = await this.prisma.$transaction([
      this.prisma.camera.count({ where: { isOnline: true } }),
      this.prisma.camera.count({ where: { isOnline: false } }),
    ]);
    return { online, offline };
  }

  async findTodayStatuses(
    startDate: Date,
    endDate: Date,
  ): Promise<CameraWithStatus[]> {
    return this.prisma.attendance.findMany({
      where: { timestamp: { gte: startDate, lte: endDate } },
      orderBy: { timestamp: 'asc' },
      select: { employeeId: true, status: true },
    });
  }

  async countUnknownToday(startDate: Date, endDate: Date): Promise<number> {
    return this.prisma.attendance.count({
      where: {
        status: AttendanceStatus.UNKNOWN,
        timestamp: { gte: startDate, lte: endDate },
      },
    });
  }

  async findRecentActivities(limit: number): Promise<RecentActivityItem[]> {
    const rows = await this.prisma.attendance.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        employee: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      employeeName: row.employee?.name ?? 'Unknown',
      time: formatTime(row.timestamp),
      status: STATUS_LABELS[row.status],
      camera: row.cameraId,
    }));
  }

  async findAllCameras(): Promise<CameraFeedItem[]> {
    const cameras = await this.prisma.camera.findMany({
      orderBy: { cameraId: 'asc' },
    });

    return cameras.map((camera) => ({
      cameraId: camera.cameraId,
      cameraName: camera.name,
      location: camera.location,
      online: camera.isOnline,
    }));
  }
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  CHECKED_IN: 'Checked In',
  ON_BREAK: 'On Break',
  TRACKING_PAUSE: 'Tracking Pause',
  CHECKED_OUT: 'Checked Out',
  UNKNOWN: 'Unknown',
};

function formatTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}