import { PrismaClient, AttendanceStatus } from "@prisma/client";
import {
  RawDashboardSummary,
  RecentActivityItem,
} from "../interfaces/dashboard.interface";

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<RawDashboardSummary> {
    const [
      totalEmployees,
      activeEmployees,
      faceRegistered,
      presentToday,
      departments,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'Active' } }),
      this.prisma.employee.count({ where: { faceRegistered: true } }),
      this.prisma.attendance.count({
        where: { timestamp: { gte: startOfDay, lt: endOfDay } },
      }),
      this.prisma.employee.findMany({
        select: { department: true },
        distinct: ["department"],
      }),
      this.prisma.attendance.count(),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      faceRegistered,
      presentToday,
      departmentCount: departments.filter((item) => item.department).length,
      recentActivity,
    };
  }

  async findRecentActivities(limit: number): Promise<RecentActivityItem[]> {
    const rows = await this.prisma.attendance.findMany({
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        employee: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      employeeName: row.employee?.name ?? "Unknown",
      time: formatTime(row.timestamp),
      status: STATUS_LABELS[row.status],
      camera: row.cameraId,
    }));
  }
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  CHECKED_IN: "Checked In",
  ON_BREAK: "On Break",
  TRACKING_PAUSE: "Tracking Pause",
  CHECKED_OUT: "Checked Out",
  UNKNOWN: "Unknown",
};

function formatTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
