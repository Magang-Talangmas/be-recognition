import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { deleteSnapshot } from '../lib/storage';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

// Jalankan cron setiap hari jam 00:00 (tengah malam)
export function initSnapshotCleanupJob() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Menjalankan cron job pembersihan snapshot usang...');
    try {
      // Cari data attendance yang snapshotnya belum dikonfirmasi selama 7 hari
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const staleAttendances = await prisma.attendance.findMany({
        where: {
          snapshotUrl: { not: null },
          confirmationStatus: 'PENDING',
          createdAt: { lt: sevenDaysAgo },
        },
      });

      if (staleAttendances.length === 0) {
        logger.info('Tidak ada snapshot usang untuk dibersihkan hari ini.');
        return;
      }

      logger.info(`Ditemukan ${staleAttendances.length} snapshot usang untuk dihapus.`);

      for (const att of staleAttendances) {
        if (att.snapshotUrl) {
          try {
            await deleteSnapshot(att.snapshotUrl);
            await prisma.attendance.update({
              where: { id: att.id },
              data: { snapshotUrl: null },
            });
            logger.info(`Berhasil menghapus snapshot usang untuk attendance ID: ${att.id}`);
          } catch (err) {
            logger.error(`Gagal menghapus snapshot untuk attendance ID: ${att.id}`, {
              error: err instanceof Error ? err.message : 'unknown',
            });
          }
        }
      }
      logger.info('Cron job pembersihan snapshot selesai.');
    } catch (error) {
      logger.error('Error saat menjalankan cron job pembersihan snapshot', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  });
  logger.info('Job pembersihan snapshot (cron) telah diinisialisasi.');
}
