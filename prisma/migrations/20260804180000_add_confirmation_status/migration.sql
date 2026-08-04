-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "attendances_confirmationStatus_idx" ON "attendances"("confirmationStatus");