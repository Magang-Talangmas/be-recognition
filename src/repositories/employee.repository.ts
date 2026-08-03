import { PrismaClient, Employee } from '@prisma/client';
import { CreateEmployeeInput, UpdateEmployeeInput, EmployeeFilterInput } from '../validators/employee.validator';

export interface PaginatedEmployees {
  data: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEmployeeInput): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async findById(id: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { id } });
  }

  async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { employeeId } });
  }

  async findMany(filter: EmployeeFilterInput): Promise<PaginatedEmployees> {
    const skip = (filter.page - 1) * filter.limit;

    const where = {
      ...(filter.department && { department: filter.department }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  async update(id: string, data: UpdateEmployeeInput): Promise<Employee> {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
