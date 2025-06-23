import Redis from 'ioredis';
import { log } from './utils/logger';

// Only create Redis instance if Redis is enabled
const isRedisEnabled = !!(
  process.env.REDIS_URL ||
  process.env.REDIS_HOST ||
  process.env.REDIS_ENABLED === 'true'
);

export const redis = isRedisEnabled
  ? process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
      })
  : null;

if (redis) {
  redis.on('error', (error) => {
    log.warn('Redis connection error (continuing without cache)', { error: error.message });
  });

  redis.on('connect', () => {
    log.info('Connected to Redis');
  });
} else {
  log.info('Redis caching disabled - running without cache');
}