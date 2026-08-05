import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AttendanceService } from './src/services/attendance.service';
import { AttendanceRepository } from './src/repositories/attendance.repository';
import { EmployeeRepository } from './src/repositories/employee.repository';
import { ScheduleRepository } from './src/repositories/schedule.repository';

const prisma = new PrismaClient();
const redis = new Redis();

async function main() {
  const attendanceRepo = new AttendanceRepository(prisma);
  const employeeRepo = new EmployeeRepository(prisma);
  const scheduleRepo = new ScheduleRepository(prisma);
  const service = new AttendanceService(attendanceRepo, employeeRepo, scheduleRepo, redis);

  // 1. Dapatkan dummy employee
  const employee = await prisma.employee.findFirst();
  if (!employee) {
    console.log("No employee found");
    return;
  }

  // 2. Simulasi Waktu Absen: Hari ini, Jam 07:55 (Harusnya tepat waktu karena batas 08:15)
  // Get current date
  const now = new Date();
  now.setHours(7, 55, 0, 0); // Set time to 07:55 local time

  console.log('Simulating check-in at:', now.toISOString(), 'day:', now.getDay());

  // 3. Panggil proses attendance
  await service.processAttendance({
    employeeId: employee.employeeId,
    cameraId: 'test-camera',
    eventType: 'CHECK_IN',
    similarity: 0.95,
    timestamp: now.toISOString(),
  });

  console.log("Process attendance success");

  // 4. Verifikasi apakah isLate tersimpan
  const saved = await prisma.attendance.findFirst({
    where: { employeeId: employee.employeeId, eventType: 'CHECK_IN' },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Saved Attendance result:', {
    timestamp: saved?.timestamp,
    isLate: saved?.isLate
  });

  // Cleanup
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.employeeId, cameraId: 'test-camera' }
  });
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    redis.quit();
  });
