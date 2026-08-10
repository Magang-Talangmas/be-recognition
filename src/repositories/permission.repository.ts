import { Prisma, PrismaClient, AttendancePermission } from '@prisma/client';
import { PermissionFilter } from '../interfaces/permission.interface';

export interface PermissionRows {
  items: AttendancePermission[];
  total: number;
}

export class PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.AttendancePermissionUncheckedCreateInput,
  ): Promise<AttendancePermission> {
    return this.prisma.attendancePermission.create({ data });
  }

  async findById(id: string): Promise<AttendancePermission | null> {
    return this.prisma.attendancePermission.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: string): Promise<AttendancePermission> {
    return this.prisma.attendancePermission.update({
      where: { id },
      data: { status },
    });
  }

  async findMany(filter: PermissionFilter): Promise<PermissionRows> {
    const where: Prisma.AttendancePermissionWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter.date ? { date: new Date(`${filter.date}T00:00:00.000Z`) } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendancePermission.findMany({
        where,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attendancePermission.count({ where }),
    ]);

    return { items, total };
  }

  /** Izin milik seorang employee pada tanggal tertentu (untuk integrasi daily). */
  async findByEmployeeAndDate(
    employeeId: string,
    date: Date,
  ): Promise<AttendancePermission | null> {
    return this.prisma.attendancePermission.findFirst({
      where: { employeeId, date },
    });
  }

  /** Izin APPROVED untuk sekumpulan employee pada tanggal tertentu. */
  async findApprovedByEmployeeAndDate(
    employeeIds: string[],
    date: Date,
  ): Promise<Pick<AttendancePermission, 'employeeId'>[]> {
    return this.prisma.attendancePermission.findMany({
      where: {
        employeeId: { in: employeeIds },
        date,
        status: 'APPROVED',
      },
      select: { employeeId: true },
    });
  }
}
