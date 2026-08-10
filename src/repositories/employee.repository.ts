import { PrismaClient, Employee, Prisma, WorkSchedule } from "@prisma/client";
import { EmployeeFilterInput } from "../validators/employee.validator";

export interface EmployeeListRows {
  items: Employee[];
  total: number;
}

export type EmployeeWithSchedule = Employee & { schedule: WorkSchedule | null };

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.EmployeeUncheckedCreateInput): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async findById(id: string) {
    return this.prisma.employee.findUnique({ where: { id }, include: { schedule: true } });
  }

  async findByEmployeeId(employeeId: string) {
    return this.prisma.employee.findUnique({ where: { employeeId }, include: { schedule: true } });
  }

  async findByEmail(email: string) {
    return this.prisma.employee.findUnique({ where: { email }, include: { schedule: true } });
  }

  async findActiveWithSchedule(): Promise<EmployeeWithSchedule[]> {
    return this.prisma.employee.findMany({
      where: {
        status: 'Active',
        scheduleId: { not: null },
      },
      include: { schedule: true },
    });
  }

  async findMany(filter: EmployeeFilterInput): Promise<EmployeeListRows> {
    const skip = (filter.page - 1) * filter.per_page;

    const where = {
      ...(filter.department ? { department: filter.department } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              {
                name: { contains: filter.search, mode: "insensitive" as const },
              },
              {
                employeeId: {
                  contains: filter.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: filter.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: filter.per_page,
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { items: rows, total };
  }

  async update(
    id: string,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<Employee> {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Employee> {
    return this.prisma.employee.delete({ where: { id } });
  }

  async toggleStatus(id: string, status: string): Promise<Employee> {
    return this.prisma.employee.update({ where: { id }, data: { status } });
  }

  async toggleFace(id: string, faceRegistered: boolean): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data: { faceRegistered },
    });
  }
}
