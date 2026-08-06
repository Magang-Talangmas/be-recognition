-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "notifUnregistered" BOOLEAN NOT NULL DEFAULT true,
    "notifCctvOffline" BOOLEAN NOT NULL DEFAULT true,
    "notifMissingCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "trackPauseAuto" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
