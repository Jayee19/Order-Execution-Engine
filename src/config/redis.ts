import { createClient } from 'redis';
import { env } from './env.js';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: env.REDIS_URL,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.info('✓ Redis connected'));

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

