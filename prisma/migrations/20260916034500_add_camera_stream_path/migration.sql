-- CreateEnum
CREATE TYPE "CameraSourceType" AS ENUM ('RTSP', 'RTMP');

-- AlterTable
ALTER TABLE "cameras"
ADD COLUMN "sourceType" "CameraSourceType" NOT NULL DEFAULT 'RTSP',
ADD COLUMN "streamPath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cameras_streamPath_key" ON "cameras"("streamPath");
