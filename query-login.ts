import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.employee.findMany({
    select: {
      employeeId: true,
      name: true,
      email: true,
      status: true,
      password: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  for (const e of emps) {
    console.log(
      `${e.employeeId} | ${e.name} | ${e.email} | status=${e.status} | password=${e.password ? 'ADA' : 'NULL'} | ${e.createdAt.toISOString()}`,
    );
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
