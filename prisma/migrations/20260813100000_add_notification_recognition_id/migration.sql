-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "recognitionId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_recognitionId_idx" ON "notifications"("recognitionId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;