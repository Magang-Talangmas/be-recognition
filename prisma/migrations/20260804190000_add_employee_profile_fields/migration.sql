-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "email" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");