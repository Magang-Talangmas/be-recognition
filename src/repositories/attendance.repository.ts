import { PrismaClient, Attendance, AttendanceStatus } from '@prisma/client';
import { AttendanceFilter, AttendanceWithEmployee, PaginatedAttendance } from '../interfaces/attendance.interface';

export class AttendanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    employeeId: string | null;
    cameraId: string;
    status: AttendanceStatus;
    timestamp: Date;
  }): Promise<Attendance> {
    return this.prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        cameraId: data.cameraId,
        status: data.status,
        timestamp: data.timestamp,
      },
    });
  }

  async findById(id: string): Promise<AttendanceWithEmployee | null> {
    return this.prisma.attendance.findUnique({
      where: { id },
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
  }

  async findMany(filter: AttendanceFilter): Promise<PaginatedAttendance> {
    const skip = (filter.page - 1) * filter.limit;

    const where = {
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.startDate || filter.endDate
        ? {
            timestamp: {
              ...(filter.startDate && { gte: filter.startDate }),
              ...(filter.endDate && { lte: filter.endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: filter.limit,
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
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data: data as AttendanceWithEmployee[],
      pagination: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }
}
