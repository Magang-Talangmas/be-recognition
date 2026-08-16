import { PrismaClient, Attendance, Employee } from '@prisma/client';
import {
  AttendanceCreateInput,
  AttendanceFilter,
  AttendanceWithEmployee,
  ConfirmationStatus,
  DailyAttendanceItem,
  PaginatedAttendance,
} from '../interfaces/attendance.interface';

export class AttendanceRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(data: AttendanceCreateInput): Promise<Attendance> {
    return this.prisma.attendance.create({
      data: {
        externalEventId: data.externalEventId,
        employeeId: data.employeeId,
        cameraId: data.cameraId,
        eventType: data.eventType,
        similarity: data.similarity,
        timestamp: data.timestamp,
        confirmationStatus: (data.confirmationStatus ?? 'PENDING') as any,
        isLate: data.isLate,
        photoUrl: data.photoUrl ?? null,
        snapshotUrl: data.snapshotUrl ?? null,
      } as any,
    });
  }

  // cek apakah event_id dari AI sudah pernah diproses.
  async findByExternalEventId(externalEventId: string): Promise<Attendance | null> {
    return this.prisma.attendance.findUnique({
      where: { externalEventId },
    });
  }

  // Update status konfirmasi attendance berdasarkan externalEventId (dipakai saat konfirmasi recognition dari mobile).
  async updateConfirmationStatusByExternalEventId(
    externalEventId: string,
    status: ConfirmationStatus,
  ): Promise<number> {
    const result = await this.prisma.attendance.updateMany({
      where: { externalEventId },
      data: { confirmationStatus: status as any },
    });
    return result.count;
  }

  async updateByExternalEventId(
    externalEventId: string,
    data: { timestamp: Date; similarity?: number; snapshotUrl?: string | null }
  ): Promise<void> {
    await this.prisma.attendance.updateMany({
      where: { externalEventId },
      data: data as any,
    });
  }

  // Ambil daftar employee yang sudah melakukan CHECK_IN pada rentang hari tertentu.
  async findCheckInsForEmployees(
    employeeIds: string[],
    start: Date,
    end: Date,
  ): Promise<Pick<Attendance, 'employeeId'>[]> {
    return this.prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        eventType: 'CHECK_IN',
        timestamp: { gte: start, lt: end },
      },
      select: { employeeId: true },
    });
  }

  // Cek apakah employee sudah memiliki record absensi pada hari yang sama (misal CHECK_IN hanya 1x per hari)
  async findTodayAttendance(
    employeeId: string,
    eventType: string,
    targetDate: Date = new Date(),
  ): Promise<Attendance | null> {
    const dayStr = targetDate.toISOString().split('T')[0];
    const startOfDay = new Date(`${dayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dayStr}T23:59:59.999Z`);

    return this.prisma.attendance.findFirst({
      where: {
        employeeId,
        eventType,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  async findById(id: string): Promise<AttendanceWithEmployee | null> {
    const result = await this.prisma.attendance.findUnique({
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
    return result as unknown as AttendanceWithEmployee | null;
  }

  async updateConfirmationStatus(
    id: string,
    status: ConfirmationStatus,
  ): Promise<AttendanceWithEmployee | null> {
    const result = await this.prisma.attendance.update({
      where: { id },
      data: {
        confirmationStatus: status as any,
      },
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
    return result as unknown as AttendanceWithEmployee | null;
  }

  async updateSnapshotUrl(id: string, snapshotUrl: string | null): Promise<void> {
    await this.prisma.attendance.update({
      where: { id },
      data: { snapshotUrl },
    });
  }


  async findMany(filter: AttendanceFilter): Promise<PaginatedAttendance> {
    const skip = (filter.page - 1) * filter.limit;

    const where = {
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.eventType && { eventType: filter.eventType }),
      ...(filter.confirmationStatus && { confirmationStatus: filter.confirmationStatus as any }),
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
      data: data as unknown as AttendanceWithEmployee[],
      pagination: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  // Daftar harian: semua employee (aktif paling atas) + status hadir/absen pada tanggal tertentu.
  async findDailyAttendance(
    startOfDay: Date,
    endOfDay: Date,
    dateKey: string,
  ): Promise<DailyAttendanceItem[]> {
    const permissionDate = new Date(`${dateKey}T00:00:00.000Z`);

    const [employees, attendances, permissions] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.attendance.findMany({
        where: { timestamp: { gte: startOfDay, lt: endOfDay } },
        orderBy: { timestamp: 'asc' },
      }),
      (this.prisma as any).attendancePermission.findMany({
        where: { date: permissionDate },
      }),
    ]);

    const byEmployee = new Map<string, (typeof attendances)[number][]>();
    for (const att of attendances) {
      if (!att.employeeId) continue;
      const list = byEmployee.get(att.employeeId);
      if (list) {
        list.push(att);
      } else {
        byEmployee.set(att.employeeId, [att]);
      }
    }

    const permissionByEmployee = new Map<
      string,
      (typeof permissions)[number]
    >();
    for (const perm of permissions) {
      if (!permissionByEmployee.has(perm.employeeId)) {
        permissionByEmployee.set(perm.employeeId, perm);
      }
    }

    return employees.map((emp: Employee) => {
      const records = byEmployee.get(emp.employeeId) ?? [];
      const checkIn = records.find((r) => r.eventType === 'CHECK_IN');
      const checkOut = records.find((r) => r.eventType === 'CHECK_OUT');
      const checkInConfirmation = checkIn?.confirmationStatus ?? records[0]?.confirmationStatus ?? null;
      const permission = permissionByEmployee.get(emp.employeeId);

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        employeeStatus: emp.status === 'Inactive' ? 'Inactive' : 'Active',
        present: records.length > 0,
        isLate: checkIn?.isLate ?? null,
        attendanceCount: records.length,
        confirmationStatus: (checkInConfirmation ?? null) as ConfirmationStatus | null,
        checkInAt: checkIn ? checkIn.timestamp.toISOString() : null,
        checkOutAt: checkOut ? checkOut.timestamp.toISOString() : null,
        photo:
          (checkIn as any)?.photoUrl ??
          (Array.isArray(emp.photos) && emp.photos.length > 0
            ? (emp.photos[0] as string)
            : null),
        permission: permission
          ? {
              id: permission.id,
              type: permission.type,
              reason: permission.reason,
              photoUrl: permission.photoUrl,
              status: permission.status,
            }
          : null,
      };
    });
  }
}
