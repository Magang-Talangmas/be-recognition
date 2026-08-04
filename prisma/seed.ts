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

  // Buat employee terdaftar di AI
  const initialEmployees = [
    { employeeId: 'EMP001', name: 'Budi Santoso', department: 'Engineering', position: 'Developer' },
    { employeeId: 'akmalShaumNadzirin', name: 'Akmal Shaum Nadzirin', department: 'Engineering', position: 'AI Engineer' },
    { employeeId: 'gibranRaisHilmyIskandar', name: 'Gibran Rais Hilmy Iskandar', department: 'Engineering', position: 'Software Engineer' },
    { employeeId: 'muchPanjiLaksono', name: 'Much Panji Laksono', department: 'Operations', position: 'Operations Specialist' },
    { employeeId: 'sabrinaAskaAmalina', name: 'Sabrina Aska Amalina', department: 'HR', position: 'HR Specialist' },
    { employeeId: 'septadaAlvianRasyid', name: 'Septada Alvian Rasyid', department: 'Management', position: 'Manager' },
    { employeeId: 'tiaraSofa', name: 'Tiara Sofa', department: 'Finance', position: 'Finance Specialist' },
  ];

  for (const emp of initialEmployees) {
    const record = await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: emp,
    });
    console.log('✅ Employee siap:', record.employeeId, '-', record.name);
  }

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
  console.log(`✅ ${cameras.length} kamera CCTV dibuat`);

  await prisma.$disconnect();
  console.log('🎉 Seeding selesai!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
