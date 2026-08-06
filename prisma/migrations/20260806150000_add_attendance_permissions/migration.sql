-- CreateTable
CREATE TABLE "attendance_permissions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_permissions_employeeId_idx" ON "attendance_permissions"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_permissions_date_idx" ON "attendance_permissions"("date");

-- CreateIndex
CREATE INDEX "attendance_permissions_status_idx" ON "attendance_permissions"("status");
