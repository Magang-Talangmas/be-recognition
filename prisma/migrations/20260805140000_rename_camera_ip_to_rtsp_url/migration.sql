-- RenameColumn
ALTER TABLE "cameras" RENAME COLUMN "ip" TO "rtspUrl";

-- RenameIndex
ALTER INDEX "cameras_ip_key" RENAME TO "cameras_rtspUrl_key";
