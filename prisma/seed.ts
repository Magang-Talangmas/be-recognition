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
    where: { employeeId: 'EMP001' },
    update: {},
    create: {
      employeeId: 'EMP001',
      name: 'Budi Santoso',
      department: 'Engineering',
      position: 'Developer',
    },
  });
  console.log('Employee dibuat:', employee.employeeId, '-', employee.name);

  const cameras = [
    {
      cameraId: 'CAM-01',
      name: 'Pintu Masuk',
      location: 'Lantai 1 - Lobby',
      isOnline: true,
    },
    {
      cameraId: 'CAM-02',
      name: 'Pintu Keluar',
      location: 'Lantai 1 - Lobby',
      isOnline: true,
    },
    {
      cameraId: 'CAM-03',
      name: 'Kantin',
      location: 'Lantai 2 - Kantin',
      isOnline: false,
    },
  ];

  for (const camera of cameras) {
    await prisma.camera.upsert({
      where: { cameraId: camera.cameraId },
      update: { name: camera.name, location: camera.location, isOnline: camera.isOnline },
      create: camera,
    });
  }
  console.log(` ${cameras.length} kamera CCTV dibuat`);

  await prisma.$disconnect();
  console.log(' Seeding selesai!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
