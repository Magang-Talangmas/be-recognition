import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma } from './lib/prisma/client';
import { disconnectRedis } from './lib/redis/client';
import { initSnapshotCleanupJob } from './jobs/snapshot-cleanup.job';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server berjalan di port ${env.PORT} [${env.NODE_ENV}]`);
  
  // Inisialisasi background jobs
  initSnapshotCleanupJob();
});

// === Graceful Shutdown ===
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Menerima sinyal ${signal}, memulai graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server ditutup');

    try {
      await disconnectPrisma();
      await disconnectRedis();
      logger.info('Semua koneksi berhasil ditutup');
      process.exit(0);
    } catch (error) {
      logger.error('Error saat menutup koneksi', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});
