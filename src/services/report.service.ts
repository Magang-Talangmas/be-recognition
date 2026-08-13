import { ReportRepository } from '../repositories/report.repository';
import {
  ReportTypeValue,
  ReportQueryInput,
} from '../validators/report.validator';
import {
  ReportAttendanceRow,
  ReportEmployeeRow,
  ReportPeriodDetail,
  ReportPermissionRow,
  ReportResult,
  ReportRow,
  ReportTotals,
} from '../interfaces/report.interface';
import { NotFoundError } from '../errors/NotFoundError';

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function mondayOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return addDays(startOfDay(date), -day);
}

function toDateKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toMonthKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function dateLabel(date: Date): string {
  return `${DAYS_ID[date.getDay()]}, ${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

function weekLabel(start: Date): string {
  const end = addDays(start, 6);
  return `${start.getDate()} ${MONTHS_ID[start.getMonth()]} - ${end.getDate()} ${MONTHS_ID[end.getMonth()]} ${end.getFullYear()}`;
}

function monthLabel(date: Date): string {
  return `${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

function emptyTotals(): ReportTotals {
  return { present: 0, late: 0, absent: 0, permission: 0, unknown: 0 };
}

function addTotals(target: ReportTotals, source: ReportTotals): void {
  target.present += source.present;
  target.late += source.late;
  target.absent += source.absent;
  target.permission += source.permission;
  target.unknown += source.unknown;
}

interface ReportQuery {
  type: ReportTypeValue;
  startDate: Date;
  endDate: Date;
  page: number;
  perPage: number;
}

export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async getReport(input: ReportQueryInput): Promise<ReportResult> {
    const query = this.buildQuery(input);
    const [attendances, employees, permissions] = await Promise.all([
      this.reportRepository.findAttendanceRange(query.startDate, query.endDate),
      this.reportRepository.findEmployees(),
      this.reportRepository.findPermissionsRange(query.startDate, query.endDate),
    ]);

    const rows = this.buildRows(query.type, attendances, employees, permissions, query);
    const totals = this.computeTotals(rows);
    const total = rows.length;
    const totalPages = Math.ceil(total / query.perPage);
    const start = (query.page - 1) * query.perPage;
    const pagedRows = rows.slice(start, start + query.perPage);

    return {
      rows: pagedRows,
      totals,
      total,
      page: query.page,
      per_page: query.perPage,
      total_pages: totalPages,
    };
  }

  private buildQuery(input: ReportQueryInput): ReportQuery {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startDate = input.start_date
      ? parseDateInput(input.start_date)
      : firstOfMonth;

    const endDate = input.end_date
      ? addDays(parseDateInput(input.end_date), 1)
      : addMonths(firstOfMonth, 1);

    return {
      type: input.type,
      startDate,
      endDate: endDate <= startDate ? addDays(startDate, 1) : endDate,
      page: input.page,
      perPage: input.per_page,
    };
  }

  private buildRows(
    type: ReportTypeValue,
    attendances: ReportAttendanceRow[],
    employees: ReportEmployeeRow[],
    permissions: ReportPermissionRow[],
    query: ReportQuery,
  ): ReportRow[] {
    switch (type) {
      case 'daily':
        return this.buildPeriodRows(
          attendances,
          permissions,
          employees,
          query.startDate,
          query.endDate,
          'day',
        );
      case 'weekly':
        return this.buildPeriodRows(
          attendances,
          permissions,
          employees,
          query.startDate,
          query.endDate,
          'week',
        );
      case 'monthly':
        return this.buildPeriodRows(
          attendances,
          permissions,
          employees,
          query.startDate,
          query.endDate,
          'month',
        );
      case 'employee':
        return this.buildEmployeeRows(attendances, permissions, employees);
      case 'recognition':
        return this.buildRecognitionRows(attendances, employees);
      case 'unknown':
        return this.buildUnknownRows(attendances);
    }
  }

  private buildPeriodRows(
    attendances: ReportAttendanceRow[],
    permissions: ReportPermissionRow[],
    employees: ReportEmployeeRow[],
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): ReportRow[] {
    const activeCount = employees.filter((e) => e.status === 'Active').length;

    const eventsByPeriod = new Map<string, ReportAttendanceRow[]>();
    for (const att of attendances) {
      const key = this.periodKey(att.timestamp, granularity);
      const list = eventsByPeriod.get(key);
      if (list) {
        list.push(att);
      } else {
        eventsByPeriod.set(key, [att]);
      }
    }

    const permissionsByPeriod = new Map<string, string[]>();
    for (const perm of permissions) {
      const key = this.periodKey(perm.date, granularity);
      const list = permissionsByPeriod.get(key);
      if (list) {
        if (!list.includes(perm.employeeId)) list.push(perm.employeeId);
      } else {
        permissionsByPeriod.set(key, [perm.employeeId]);
      }
    }

    const rows: ReportRow[] = [];
    for (const periodStart of this.iteratePeriods(startDate, endDate, granularity)) {
      const key = this.periodKey(periodStart, granularity);
      const events = eventsByPeriod.get(key) ?? [];

      const presentEmployees = new Set<string>();
      const lateEmployees = new Set<string>();
      let unknown = 0;

      for (const att of events) {
        if (!att.employeeId) {
          unknown += 1;
          continue;
        }
        if (att.eventType === 'CHECK_IN') {
          if (att.isLate) {
            lateEmployees.add(att.employeeId);
          } else {
            presentEmployees.add(att.employeeId);
          }
        }
      }

      const permissionEmployees = permissionsByPeriod.get(key) ?? [];
      const permissionCount = permissionEmployees.filter(
        (empId) => !presentEmployees.has(empId) && !lateEmployees.has(empId),
      ).length;

      const present = presentEmployees.size;
      const late = lateEmployees.size;
      const permission = permissionCount;
      const absent = Math.max(0, activeCount - present - late - permission);

      rows.push({
        code: this.periodCode(periodStart, granularity),
        label: this.periodLabel(periodStart, granularity),
        present,
        late,
        absent,
        permission,
        unknown,
      });
    }

    return rows;
  }

  private buildEmployeeRows(
    attendances: ReportAttendanceRow[],
    permissions: ReportPermissionRow[],
    employees: ReportEmployeeRow[],
  ): ReportRow[] {
    const byEmployee = new Map<string, ReportAttendanceRow[]>();
    for (const att of attendances) {
      if (!att.employeeId) continue;
      const list = byEmployee.get(att.employeeId);
      if (list) {
        list.push(att);
      } else {
        byEmployee.set(att.employeeId, [att]);
      }
    }

    const permissionDates = new Map<string, Set<string>>();
    for (const perm of permissions) {
      const key = perm.date.toISOString().split('T')[0];
      const set = permissionDates.get(perm.employeeId);
      if (set) {
        set.add(key);
      } else {
        permissionDates.set(perm.employeeId, new Set([key]));
      }
    }

    return employees.map((emp) => {
      const events = byEmployee.get(emp.employeeId) ?? [];
      const checkIns = events.filter((e) => e.eventType === 'CHECK_IN');
      const late = checkIns.filter((e) => e.isLate).length;
      const present = checkIns.length - late;
      const permission = permissionDates.get(emp.employeeId)?.size ?? 0;
      const absent =
        emp.status === 'Active' && checkIns.length === 0 && permission === 0 ? 1 : 0;

      return {
        code: emp.id,
        label: `${emp.name} (${emp.employeeId})`,
        present,
        late,
        absent,
        permission,
        unknown: 0,
      };
    });
  }

  private buildRecognitionRows(
    attendances: ReportAttendanceRow[],
    employees: ReportEmployeeRow[],
  ): ReportRow[] {
    const byEmployee = new Map<string, number>();
    for (const att of attendances) {
      if (!att.employeeId) continue;
      byEmployee.set(att.employeeId, (byEmployee.get(att.employeeId) ?? 0) + 1);
    }

    return employees.map((emp) => ({
      code: emp.id,
      label: `${emp.name} (${emp.employeeId})`,
      present: byEmployee.get(emp.employeeId) ?? 0,
      late: 0,
      absent: 0,
      permission: 0,
      unknown: 0,
    }));
  }

  private buildUnknownRows(attendances: ReportAttendanceRow[]): ReportRow[] {
    const byCamera = new Map<string, number>();
    for (const att of attendances) {
      if (att.employeeId) continue;
      byCamera.set(att.cameraId, (byCamera.get(att.cameraId) ?? 0) + 1);
    }

    return Array.from(byCamera.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cameraId, count]) => ({
        code: cameraId,
        label: cameraId === 'unknown' ? 'Kamera Tidak Diketahui' : `Kamera ${cameraId}`,
        present: 0,
        late: 0,
        absent: 0,
        permission: 0,
        unknown: count,
      }));
  }

  private periodKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
    switch (granularity) {
      case 'day':
        return toDateKey(date);
      case 'week':
        return toDateKey(mondayOfWeek(date));
      case 'month':
        return toMonthKey(date);
    }
  }

  private periodCode(
    periodStart: Date,
    granularity: 'day' | 'week' | 'month',
  ): string {
    switch (granularity) {
      case 'day':
        return toDateKey(periodStart);
      case 'week':
        return toDateKey(periodStart);
      case 'month':
        return toMonthKey(periodStart);
    }
  }

  private periodLabel(
    periodStart: Date,
    granularity: 'day' | 'week' | 'month',
  ): string {
    switch (granularity) {
      case 'day':
        return dateLabel(periodStart);
      case 'week':
        return weekLabel(periodStart);
      case 'month':
        return monthLabel(periodStart);
    }
  }

  private *iteratePeriods(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): Generator<Date> {
    let cursor =
      granularity === 'week'
        ? mondayOfWeek(startDate)
        : startOfDay(startDate);

    while (cursor < endDate) {
      yield cursor;
      if (granularity === 'month') {
        cursor = addMonths(cursor, 1);
      } else {
        cursor = addDays(cursor, granularity === 'week' ? 7 : 1);
      }
    }
  }

  private computeTotals(rows: ReportRow[]): ReportTotals {
    const totals = emptyTotals();
    for (const row of rows) {
      addTotals(totals, row);
    }
    return totals;
  }

  async getPeriodDetail(code: string): Promise<ReportPeriodDetail> {
    const parsed = this.parsePeriodCode(code);
    if (!parsed) {
      throw new NotFoundError('Data tidak ditemukan');
    }

    const [attendances, employees, permissions] = await Promise.all([
      this.reportRepository.findAttendanceRange(parsed.startDate, parsed.endDate),
      this.reportRepository.findEmployees(),
      this.reportRepository.findPermissionsRange(parsed.startDate, parsed.endDate),
    ]);

    const byEmployee = new Map<string, ReportAttendanceRow[]>();
    let unknown = 0;
    for (const att of attendances) {
      if (!att.employeeId) {
        unknown += 1;
        continue;
      }
      const list = byEmployee.get(att.employeeId);
      if (list) {
        list.push(att);
      } else {
        byEmployee.set(att.employeeId, [att]);
      }
    }

    const permissionDates = new Map<string, Set<string>>();
    for (const perm of permissions) {
      const key = perm.date.toISOString().split('T')[0];
      const set = permissionDates.get(perm.employeeId);
      if (set) {
        set.add(key);
      } else {
        permissionDates.set(perm.employeeId, new Set([key]));
      }
    }

    const employeeRows = employees.map((emp) => {
      const events = byEmployee.get(emp.employeeId) ?? [];
      const checkIns = events.filter((e) => e.eventType === 'CHECK_IN');
      const late = checkIns.filter((e) => e.isLate).length;
      const present = checkIns.length - late;
      const permission = permissionDates.get(emp.employeeId)?.size ?? 0;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        status: (emp.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
        present,
        late,
        absent: emp.status === 'Active' && checkIns.length === 0 && permission === 0 ? 1 : 0,
        permission,
        unknown: 0,
      };
    });

    return {
      code,
      type: parsed.type,
      label: parsed.label,
      start_date: parsed.startDate.toISOString(),
      end_date: parsed.endDate.toISOString(),
      totals: {
        present: employeeRows.reduce((sum, row) => sum + row.present, 0),
        late: employeeRows.reduce((sum, row) => sum + row.late, 0),
        absent: employeeRows.reduce((sum, row) => sum + row.absent, 0),
        permission: employeeRows.reduce((sum, row) => sum + row.permission, 0),
        unknown,
      },
      employees: employeeRows,
    };
  }

  private parsePeriodCode(
    code: string,
  ): { type: 'daily' | 'monthly'; startDate: Date; endDate: Date; label: string } | null {
    const monthMatch = code.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      const start = new Date(year, month - 1, 1);
      if (start.getFullYear() !== year || start.getMonth() !== month - 1) {
        return null;
      }
      return {
        type: 'monthly',
        startDate: start,
        endDate: addMonths(start, 1),
        label: monthLabel(start),
      };
    }

    const dayMatch = code.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      const year = Number(dayMatch[1]);
      const month = Number(dayMatch[2]);
      const day = Number(dayMatch[3]);
      const start = new Date(year, month - 1, day);
      if (
        start.getFullYear() !== year ||
        start.getMonth() !== month - 1 ||
        start.getDate() !== day
      ) {
        return null;
      }
      return {
        type: 'daily',
        startDate: start,
        endDate: addDays(start, 1),
        label: dateLabel(start),
      };
    }

    return null;
  }
}
