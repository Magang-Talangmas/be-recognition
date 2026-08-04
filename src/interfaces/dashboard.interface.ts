export interface DashboardSummary {
  totalEmployees: number;
  active: number;
  inactive: number;
  faceRegistered: number;
  faceNotRegistered: number;
  presentToday: number;
  departments: number;
  recentActivity: number;
}

export interface RecentActivityItem {
  employeeName: string;
  time: string;
  status: string;
  camera: string;
}

export interface RawDashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  faceRegistered: number;
  presentToday: number;
  departmentCount: number;
  recentActivity: number;
}
