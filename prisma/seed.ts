import { getPrismaClient } from "../src/lib/prisma/client";
import bcrypt from "bcryptjs";
import { ConfirmationStatus } from "../src/interfaces/attendance.interface";

const DAILY_SCHEDULE = [
  { eventType: "CHECK_IN", hour: 8, minute: 0 },
  { eventType: "START_BREAK", hour: 12, minute: 0 },
  { eventType: "RETURN_FROM_BREAK", hour: 13, minute: 0 },
  { eventType: "CHECK_OUT", hour: 17, minute: 0 },
] as const;

const CAMERAS = ["CAM-01", "CAM-02"];

function seedTimestamp(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pickConfirmation(dayOffset: number, index: number): ConfirmationStatus {
  if (dayOffset === 0) {
    const pool: ConfirmationStatus[] = ["PENDING", "CONFIRMED", "CONFIRMED", "REJECTED"];
    return pool[index % pool.length];
  }
  return "CONFIRMED";
}

function randomSimilarity(): number {
  return Math.round((0.72 + Math.random() * 0.26) * 1000) / 1000;
}

async function seedAttendance(prisma: ReturnType<typeof getPrismaClient>, employeeIds: string[]) {
  console.log("📅 Seeding attendance dummy...");

  const records: {
    externalEventId: string;
    employeeId: string | null;
    cameraId: string;
    eventType: string;
    similarity: number;
    timestamp: Date;
    confirmationStatus: ConfirmationStatus;
  }[] = [];

  for (let day = 0; day < 3; day++) {
    for (let empIdx = 0; empIdx < employeeIds.length; empIdx++) {
      const employeeId = employeeIds[empIdx];

      for (let evIdx = 0; evIdx < DAILY_SCHEDULE.length; evIdx++) {
        const ev = DAILY_SCHEDULE[evIdx];
        const timestamp = seedTimestamp(day, ev.hour, ev.minute);

        records.push({
          externalEventId: `seed-${timestamp.toISOString().slice(0, 10)}-${employeeId}-${ev.eventType}`,
          employeeId,
          cameraId: CAMERAS[evIdx % CAMERAS.length],
          eventType: ev.eventType,
          similarity: randomSimilarity(),
          timestamp,
          confirmationStatus: pickConfirmation(day, evIdx + empIdx),
        });
      }
    }
  }

  records.push({
    externalEventId: `seed-${seedTimestamp(0, 9, 30).toISOString().slice(0, 10)}-ghost-1`,
    employeeId: null,
    cameraId: "CAM-01",
    eventType: "CHECK_IN",
    similarity: 0.81,
    timestamp: seedTimestamp(0, 9, 30),
    confirmationStatus: "PENDING",
  });

  const result = await prisma.attendance.createMany({
    data: records,
    skipDuplicates: true,
  });

  console.log(` ${result.count} record attendance dummy dibuat (sebelumnya ${records.length} direncanakan)`);
}

async function seed() {
  const prisma = getPrismaClient();

  console.log(" Seeding database...");

  // Buat user admin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      password: hashedPassword,
      name: "Admin Test",
      role: "ADMIN",
    },
  });
  console.log(" User dibuat:", user.email);

  // Buat employee terdaftar di AI
  const initialEmployees = [
    {
      employeeId: "EMP001",
      name: "Budi Santoso",
      department: "Engineering",
      position: "Developer",
    },
    {
      employeeId: "akmalShaumNadzirin",
      name: "Akmal Shaum Nadzirin",
      department: "Engineering",
      position: "AI Engineer",
    },
    {
      employeeId: "gibranRaisHilmyIskandar",
      name: "Gibran Rais Hilmy Iskandar",
      department: "Engineering",
      position: "Software Engineer",
    },
    {
      employeeId: "muchPanjiLaksono",
      name: "Much Panji Laksono",
      department: "Operations",
      position: "Operations Specialist",
    },
    {
      employeeId: "sabrinaAskaAmalina",
      name: "Sabrina Aska Amalina",
      department: "HR",
      position: "HR Specialist",
    },
    {
      employeeId: "septadaAlvianRasyid",
      name: "Septada Alvian Rasyid",
      department: "Management",
      position: "Manager",
    },
    {
      employeeId: "tiaraSofa",
      name: "Tiara Sofa",
      department: "Finance",
      position: "Finance Specialist",
    },
  ];

  const seededEmployeeIds: string[] = [];

  for (const emp of initialEmployees) {
    const record = await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: emp,
    });
    seededEmployeeIds.push(record.employeeId);
    console.log("✅ Employee siap:", record.employeeId, "-", record.name);
  }

  const cameras = [
    {
      cameraId: "CAM-01",
      name: "Pintu Masuk",
      location: "Lantai 1 - Lobby",
      isOnline: true,
    },
    {
      cameraId: "CAM-02",
      name: "Pintu Keluar",
      location: "Lantai 1 - Lobby",
      isOnline: true,
    },
    {
      cameraId: "CAM-03",
      name: "Kantin",
      location: "Lantai 2 - Kantin",
      isOnline: false,
    },
  ];

  for (const camera of cameras) {
    await prisma.camera.upsert({
      where: { cameraId: camera.cameraId },
      update: {
        name: camera.name,
        location: camera.location,
        isOnline: camera.isOnline,
      },
      create: camera,
    });
  }
  console.log(`✅ ${cameras.length} kamera CCTV dibuat`);

  // Seeding attendance dummy untuk tiap employee
  await seedAttendance(prisma, seededEmployeeIds);

  await prisma.$disconnect();
  console.log("🎉 Seeding selesai!");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
