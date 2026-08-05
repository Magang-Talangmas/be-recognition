import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.employee.findMany({
    where: { email: { not: null } },
    select: { employeeId: true, name: true, email: true, status: true, password: true },
  });
  for (const e of emps) {
    const ok = e.password ? await bcrypt.compare('password123', e.password) : false;
    console.log(`${e.email} | status=${e.status} | match=${ok} | hash=${e.password ? e.password.slice(0, 20) : 'NULL'}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
