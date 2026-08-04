-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CHECKED_IN', 'ON_BREAK', 'TRACKING_PAUSE', 'CHECKED_OUT', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_employeeId_fkey";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'CHECKED_IN',
ALTER COLUMN "employeeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cameras_cameraId_key" ON "cameras"("cameraId");

-- CreateIndex
CREATE INDEX "cameras_cameraId_idx" ON "cameras"("cameraId");

-- CreateIndex
CREATE INDEX "attendances_cameraId_idx" ON "attendances"("cameraId");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;
