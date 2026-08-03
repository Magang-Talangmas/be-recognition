import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis mencoba reconnect (percobaan ke-${times}), delay ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisInstance.on('connect', () => {
      logger.info('Redis terhubung');
    });

    redisInstance.on('error', (err: Error) => {
      logger.error('Redis error', { message: err.message });
    });

    redisInstance.on('close', () => {
      logger.warn('Koneksi Redis terputus');
    });
  }

  return redisInstance;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis terputus');
  }
};
