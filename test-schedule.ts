import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Test Create
  const schedule = await prisma.workSchedule.create({
    data: {
      scheduleCode: 'SHIFT-01',
      name: 'Shift Kantor Utama',
      workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      checkInTime: '08:00',
      checkOutTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      toleranceMinutes: 15
    }
  });
  console.log('Created:', schedule);

  // Test Find All
  const all = await prisma.workSchedule.findMany();
  console.log('All Schedules:', all.length);

  // Cleanup
  await prisma.workSchedule.deleteMany();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
