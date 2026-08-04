import { AttendanceStatus } from '@prisma/client';

export interface AttendanceRequestBody {
  employee_id?: string;
  camera_id: string;
  timestamp: string;
  status?: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string | null;
  cameraId: string;
  status: AttendanceStatus;
  timestamp: Date;
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
