-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "isLate" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "scheduleCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workDays" TEXT[],
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "toleranceMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_scheduleCode_key" ON "work_schedules"("scheduleCode");
