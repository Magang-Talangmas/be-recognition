import { PrismaClient, Employee, Prisma } from '@prisma/client';
import { EmployeeFilterInput } from '../validators/employee.validator';

export interface PaginatedEmployees {
  items: Employee[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.EmployeeUncheckedCreateInput,
  ): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { employeeId } });
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { email } });
  }

  async findNextEmployeeCode(): Promise<string> {
    const employees = await this.prisma.employee.findMany({
      select: { employeeId: true },
    });

    let max = 0;
    for (const emp of employees) {
      const match = emp.employeeId.match(/EMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }

    return `EMP-${String(max + 1).padStart(3, '0')}`;
  }

  async findMany(filter: EmployeeFilterInput): Promise<PaginatedEmployees> {
    const skip = (filter.page - 1) * filter.per_page;

    const where = {
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' as const } },
              { employeeId: { contains: filter.search, mode: 'insensitive' as const } },
              { email: { contains: filter.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filter.department && { department: filter.department }),
      ...(filter.status
        ? { isActive: filter.status === 'Active' }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: filter.per_page,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items,
      total,
      page: filter.page,
      per_page: filter.per_page,
      total_pages: Math.ceil(total / filter.per_page),
    };
  }

  async update(
    id: string,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<Employee> {
    return this.prisma.employee.update({ where: { employeeId: id }, data });
  }

  async toggleStatus(id: string): Promise<Employee> {
    const employee = await this.findByEmployeeId(id);
    if (!employee) throw employee;
    return this.prisma.employee.update({
      where: { employeeId: id },
      data: { isActive: !employee.isActive },
    });
  }

  async toggleFace(id: string): Promise<Employee> {
    const employee = await this.findByEmployeeId(id);
    if (!employee) throw employee;
    return this.prisma.employee.update({
      where: { employeeId: id },
      data: { faceRegistered: !employee.faceRegistered },
    });
  }

  async softDelete(id: string): Promise<Employee> {
    return this.prisma.employee.update({
      where: { employeeId: id },
      data: { isActive: false },
    });
  }
}