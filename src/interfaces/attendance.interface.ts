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
