-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "employeeId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_employeeId_idx" ON "notifications"("employeeId");