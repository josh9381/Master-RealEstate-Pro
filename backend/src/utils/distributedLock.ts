import { getRedisClient } from '../config/redis'
import { logger } from '../lib/logger'

/**
 * Acquire a distributed lock using Redis SETNX.
 * Returns true if the lock was acquired, false otherwise.
 * The lock auto-expires after `ttlSeconds` to prevent deadlocks.
 */
export async function acquireLock(key: string, ttlSeconds: number = 60): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    // Redis not available — allow execution (single-instance fallback)
    return true
  }

  try {
    const result = await redis.set(key, Date.now().toString(), 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  } catch (err) {
    logger.warn({ err, key }, 'Failed to acquire distributed lock — allowing execution')
    return true // Fail-open: if Redis is down, allow the job to run
  }
}

/**
 * Release a distributed lock.
 */
export async function releaseLock(key: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.del(key)
  } catch (err) {
    logger.warn({ err, key }, 'Failed to release distributed lock')
  }
}
