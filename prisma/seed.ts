import { getPrismaClient } from '../src/lib/prisma/client';
import bcrypt from 'bcryptjs';

async function seed() {
  const prisma = getPrismaClient();

  console.log('🌱 Seeding database...');

  // Buat user admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin Test',
      role: 'ADMIN',
    },
  });
  console.log('✅ User dibuat:', user.email);

  // Buat employee contoh
  const employee = await prisma.employee.upsert({
    where: { employeeId: 'EMP-001' },
    update: {},
    create: {
      employeeId: 'EMP-001',
      name: 'Budi Santoso',
      email: 'budi@talangmas.co.id',
      department: 'Engineering',
      position: 'Developer',
      isActive: true,
      faceRegistered: true,
      joinedAt: new Date('2023-02-14'),
      photos: [],
    },
  });
  console.log('✅ Employee dibuat:', employee.employeeId, '-', employee.name);

  await prisma.$disconnect();
  console.log('✅ Seeding selesai!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
