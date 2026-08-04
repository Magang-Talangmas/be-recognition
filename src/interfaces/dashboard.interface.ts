import { AttendanceStatus } from '@prisma/client';

export interface DashboardSummary {
  totalEmployees: number;
  checkedIn: number;
  onBreak: number;
  trackingPause: number;
  checkedOut: number;
  unknownFace: number;
  cctvOnline: number;
  cctvOffline: number;
}

export interface RecentActivityItem {
  employeeName: string;
  time: string;
  status: string;
  camera: string;
}

export interface CameraFeedItem {
  cameraId: string;
  cameraName: string;
  location: string | null;
  online: boolean;
}

export interface CameraWithStatus {
  employeeId: string | null;
  status: AttendanceStatus;
}