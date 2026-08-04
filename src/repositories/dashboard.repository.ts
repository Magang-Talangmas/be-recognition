import { PrismaClient } from '@prisma/client';
import { RawDashboardSummary } from '../interfaces/dashboard.interface';
import { AttendanceWithEmployee } from '../interfaces/attendance.interface';

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(startOfDay: Date, endOfDay: Date): Promise<RawDashboardSummary> {
    const [
      totalEmployees,
      activeEmployees,
      faceRegistered,
      presentToday,
      departments,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { isActive: true } }),
      this.prisma.employee.count({ where: { faceRegistered: true } }),
      this.prisma.attendance.count({
        where: { timestamp: { gte: startOfDay, lt: endOfDay } },
      }),
      this.prisma.employee.findMany({
        select: { department: true },
        distinct: ['department'],
      }),
      this.prisma.attendance.count(),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      faceRegistered,
      presentToday,
      departmentCount: departments.filter((item) => item.department).length,
      recentActivity,
    };
  }

  async findRecentActivity(limit: number): Promise<AttendanceWithEmployee[]> {
    const recent = await this.prisma.attendance.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
            position: true,
          },
        },
      },
    });

    return recent as AttendanceWithEmployee[];
  }
}