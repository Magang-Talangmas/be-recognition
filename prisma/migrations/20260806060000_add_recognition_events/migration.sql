-- CreateTable
CREATE TABLE "recognition_events" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "cameraId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Verified',
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recognition_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recognition_events_cameraId_idx" ON "recognition_events"("cameraId");

-- CreateIndex
CREATE INDEX "recognition_events_employeeId_idx" ON "recognition_events"("employeeId");

-- CreateIndex
CREATE INDEX "recognition_events_status_idx" ON "recognition_events"("status");

-- CreateIndex
CREATE INDEX "recognition_events_createdAt_idx" ON "recognition_events"("createdAt");
