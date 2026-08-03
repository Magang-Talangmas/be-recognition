export interface AttendanceRequestBody {
  employee_id: string;
  camera_id: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  cameraId: string;
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
  };
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
