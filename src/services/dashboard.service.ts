import { AttendanceStatus } from '@prisma/client';
import { DashboardRepository } from '../repositories/dashboard.repository';
import {
  DashboardSummary,
  RecentActivityItem,
  CameraFeedItem,
} from '../interfaces/dashboard.interface';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(): Promise<DashboardSummary> {
    const startDate = startOfToday();
    const endDate = endOfToday();

    const [totalEmployees, cameras, statuses, unknownFace] = await Promise.all([
      this.dashboardRepository.countActiveEmployees(),
      this.dashboardRepository.countCameras(),
      this.dashboardRepository.findTodayStatuses(startDate, endDate),
      this.dashboardRepository.countUnknownToday(startDate, endDate),
    ]);

    // Status kehadiran aktif = status terakhir setiap employee hari ini
    const lastStatusByEmployee = new Map<string, AttendanceStatus>();
    for (const record of statuses) {
      if (record.employeeId) {
        lastStatusByEmployee.set(record.employeeId, record.status);
      }
    }

    let checkedIn = 0;
    let onBreak = 0;
    let trackingPause = 0;
    let checkedOut = 0;

    for (const status of lastStatusByEmployee.values()) {
      switch (status) {
        case AttendanceStatus.CHECKED_IN:
          checkedIn += 1;
          break;
        case AttendanceStatus.ON_BREAK:
          onBreak += 1;
          break;
        case AttendanceStatus.TRACKING_PAUSE:
          trackingPause += 1;
          break;
        case AttendanceStatus.CHECKED_OUT:
          checkedOut += 1;
          break;
        default:
          break;
      }
    }

    return {
      totalEmployees,
      checkedIn,
      onBreak,
      trackingPause,
      checkedOut,
      unknownFace,
      cctvOnline: cameras.online,
      cctvOffline: cameras.offline,
    };
  }

  async getRecentActivity(limit = 10): Promise<RecentActivityItem[]> {
    return this.dashboardRepository.findRecentActivities(limit);
  }

  async getLiveFeed(): Promise<CameraFeedItem[]> {
    return this.dashboardRepository.findAllCameras();
  }
}