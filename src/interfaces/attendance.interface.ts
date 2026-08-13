import { AttendanceEventTypeValue } from '../validators/attendance.validator';

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface AttendanceRequestBody {
  event_id?: string;
  employee_id: string;
  event_type: AttendanceEventTypeValue;
  similarity?: number;
  detected_at: string;
  camera_id?: string;
}

export interface AttendanceCreateInput {
  externalEventId?: string;
  employeeId: string;
  cameraId: string;
  eventType: string;
  similarity?: number;
  timestamp: Date;
  confirmationStatus?: ConfirmationStatus;
  isLate?: boolean;
  photoUrl?: string;
  snapshotUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  externalEventId: string | null;
  employeeId: string | null;
  cameraId: string;
  eventType: string;
  similarity: number | null;
  timestamp: Date;
  confirmationStatus: ConfirmationStatus;
  isLate: boolean | null;
  photoUrl: string | null;
  snapshotUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceWithEmployee extends AttendanceRecord {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    department: string | null;
    position: string | null;
  } | null;
}

export interface AttendanceFilter {
  employeeId?: string;
  eventType?: string;
  confirmationStatus?: ConfirmationStatus;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface PaginatedAttendance {
  data: AttendanceWithEmployee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DailyPermissionInfo {
  id: string;
  type: string;
  reason: string;
  photoUrl: string | null;
  status: string;
}

export interface DailyAttendanceItem {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  position: string | null;
  employeeStatus: 'Active' | 'Inactive';
  present: boolean;
  isLate: boolean | null;
  attendanceCount: number;
  confirmationStatus: ConfirmationStatus | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  photo: string | null;
  permission: DailyPermissionInfo | null;
}

export interface DailyAttendanceResult {
  date: string;
  items: DailyAttendanceItem[];
  total: number;
  activeCount: number;
  presentCount: number;
  permissionCount: number;
  lateCount: number;
  absentCount: number;
}
