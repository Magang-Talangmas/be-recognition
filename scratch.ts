import { PrismaClient } from '@prisma/client';
import { EmployeeRepository } from './src/repositories/employee.repository';
import { EmployeeService } from './src/services/employee.service';

const prisma = new PrismaClient();
const repo = new EmployeeRepository(prisma);
const service = new EmployeeService(repo);

async function main() {
  try {
    const filter = {
      page: 1,
      per_page: 10,
    };
    console.log("Calling getEmployees...");
    const res = await service.getEmployees(filter);
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
