import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';

let prismaInstance: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        process.env['NODE_ENV'] === 'development'
          ? ['warn', 'error']
          : ['error'],
    });

    logger.info('Prisma client diinisialisasi');
  }

  return prismaInstance;
};

export const disconnectPrisma = async (): Promise<void> => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    logger.info('Prisma terputus dari database');
  }
};
