import Redis from 'ioredis'
import { logger } from '../lib/logger'

// Redis client singleton
let redis: Redis | null = null
let isConnected = false

/**
 * Get or create the Redis client.
 * Returns null when Redis is disabled or unavailable (graceful degradation).
 */
export function getRedisClient(): Redis | null {
  if (process.env.REDIS_ENABLED !== 'true') {
    return null
  }

  if (redis) return redis

  const url = process.env.REDIS_URL || 'redis://localhost:6379'

  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        logger.warn('Redis: max reconnection attempts reached, giving up')
        return null // stop retrying
      }
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 5000,
  })

  redis.on('connect', () => {
    isConnected = true
    logger.info('Redis connected')
  })

  redis.on('error', (err) => {
    isConnected = false
    logger.error({ err: err.message }, 'Redis error')
  })

  redis.on('close', () => {
    isConnected = false
    logger.info('Redis connection closed')
  })

  // Attempt connection (non-blocking)
  redis.connect().catch((err) => {
    logger.warn({ err: err.message }, 'Redis: could not connect, caching disabled')
    redis = null
  })

  return redis
}

/** Check if Redis is currently connected and healthy */
export function isRedisConnected(): boolean {
  return isConnected && redis !== null
}

/** Gracefully close Redis connection */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    isConnected = false
    logger.info('Redis connection closed gracefully')
  }
}
