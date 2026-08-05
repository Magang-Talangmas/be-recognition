-- AlterTable
ALTER TABLE "cameras" ADD COLUMN "ip" TEXT,
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "cameras_ip_key" ON "cameras"("ip");
