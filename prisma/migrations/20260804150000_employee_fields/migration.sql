-- AlterTable
ALTER TABLE "employees" ADD COLUMN "email" TEXT,
ADD COLUMN "faceRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "joinedAt" TIMESTAMP(3),
ADD COLUMN "photos" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");
