/*
  Warnings:

  - A unique constraint covering the columns `[externalEventId]` on the table `attendances` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'CHECK_IN',
ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "similarity" DOUBLE PRECISION,
ALTER COLUMN "cameraId" SET DEFAULT 'unknown';

-- CreateIndex
CREATE UNIQUE INDEX "attendances_externalEventId_key" ON "attendances"("externalEventId");

-- CreateIndex
CREATE INDEX "attendances_eventType_idx" ON "attendances"("eventType");

-- CreateIndex
CREATE INDEX "attendances_externalEventId_idx" ON "attendances"("externalEventId");
