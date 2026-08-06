import { PrismaClient } from '@prisma/client';
import {
  ReportAttendanceRow,
  ReportEmployeeRow,
} from '../interfaces/report.interface';

export class ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAttendanceRange(
    start: Date,
    end: Date,
  ): Promise<ReportAttendanceRow[]> {
    return this.prisma.attendance.findMany({
      where: { timestamp: { gte: start, lt: end } },
      select: {
        employeeId: true,
        cameraId: true,
        eventType: true,
        isLate: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async findEmployees(): Promise<ReportEmployeeRow[]> {
    return this.prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        position: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }
}
