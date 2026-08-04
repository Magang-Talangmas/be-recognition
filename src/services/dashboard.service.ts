import { DashboardRepository } from '../repositories/dashboard.repository';
import {
  DashboardSummary,
  RecentActivityItem,
} from '../interfaces/dashboard.interface';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(): Promise<DashboardSummary> {
    const startDate = startOfToday();
    const endDate = endOfToday();

    const raw = await this.dashboardRepository.getSummary(startDate, endDate);

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
    return this.dashboardRepository.findRecentActivities(limit);
  }
}