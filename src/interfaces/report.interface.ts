export type ReportType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'employee'
  | 'recognition'
  | 'unknown';

export interface ReportRow {
  code: string;
  label: string;
  present: number;
  late: number;
  absent: number;
  unknown: number;
}

export interface ReportTotals {
  present: number;
  late: number;
  absent: number;
  unknown: number;
}

export interface ReportResult {
  rows: ReportRow[];
  totals: ReportTotals;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ReportAttendanceRow {
  employeeId: string | null;
  cameraId: string;
  eventType: string;
  isLate: boolean | null;
  timestamp: Date;
}

export interface ReportEmployeeRow {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  position: string | null;
  status: string;
}

export interface ReportEmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  position: string | null;
  department: string | null;
  status: 'Active' | 'Inactive';
  present: number;
  late: number;
  absent: number;
  unknown: number;
}

export interface ReportPeriodDetail {
  code: string;
  type: 'daily' | 'monthly';
  label: string;
  start_date: string;
  end_date: string;
  totals: ReportTotals;
  employees: ReportEmployeeDetail[];
}
