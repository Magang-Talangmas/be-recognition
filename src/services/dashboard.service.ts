import { DashboardRepository } from '../repositories/dashboard.repository';
import {
  DashboardSummary,
  RecentActivityItem,
} from '../interfaces/dashboard.interface';
import { AttendanceWithEmployee } from '../interfaces/attendance.interface';

const CHECKED_IN_STATUS = 'Checked In';

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(): Promise<DashboardSummary> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const raw = await this.dashboardRepository.getSummary(startOfDay, endOfDay);

    return {
      totalEmployees: raw.totalEmployees,
      active: raw.activeEmployees,
      inactive: raw.totalEmployees - raw.activeEmployees,
      faceRegistered: raw.faceRegistered,
      faceNotRegistered: raw.totalEmployees - raw.faceRegistered,
      presentToday: raw.presentToday,
      departments: raw.departmentCount,
      recentActivity: raw.recentActivity,
    };
  }

  async getRecentActivity(limit = 20): Promise<RecentActivityItem[]> {
    const recent = await this.dashboardRepository.findRecentActivity(limit);

    return recent.map((item) => this.toRecentActivityItem(item));
  }

  private toRecentActivityItem(item: AttendanceWithEmployee): RecentActivityItem {
    return {
      employeeName: item.employee?.name ?? 'Unknown',
      time: formatTime(item.timestamp),
      status: CHECKED_IN_STATUS,
      camera: item.cameraId,
    };
  }
}

function formatTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}