import { getRedisClient, isRedisConnected } from '../config/redis'
import { logger } from '../lib/logger'

const DEFAULT_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'mrep:'

/**
 * Cache service with Redis backend and graceful degradation.
 * When Redis is unavailable, all operations are no-ops (cache miss).
 */
export const cacheService = {
  /**
   * Get a value from cache.
   * Returns null on miss or when Redis is unavailable.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient()
      if (!client || !isRedisConnected()) return null

      const raw = await client.get(`${CACHE_PREFIX}${key}`)
      if (!raw) return null

      return JSON.parse(raw) as T
    } catch (err) {
      logger.debug({ key, err }, 'Cache get failed')
      return null
    }
  },

  /**
   * Store a value in cache.
   * @param key   Cache key
   * @param value Value to store (will be JSON-serialised)
   * @param ttl   TTL in seconds (default 300 = 5 min)
   */
  async set(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client || !isRedisConnected()) return

      await client.setex(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(value))
    } catch (err) {
      logger.debug({ key, err }, 'Cache set failed')
    }
  },

  /**
   * Delete a specific key or pattern.
   */
  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client || !isRedisConnected()) return

      await client.del(`${CACHE_PREFIX}${key}`)
    } catch (err) {
      logger.debug({ key, err }, 'Cache del failed')
    }
  },

  /**
   * Invalidate all keys matching a prefix pattern.
   * E.g., invalidatePattern('analytics:org123:*') clears all analytics for that org.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client || !isRedisConnected()) return

      let cursor = '0'
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          `${CACHE_PREFIX}${pattern}`,
          'COUNT',
          100
        )
        cursor = nextCursor
        if (keys.length > 0) {
          await client.del(...keys)
        }
      } while (cursor !== '0')
    } catch (err) {
      logger.debug({ pattern, err }, 'Cache invalidatePattern failed')
    }
  },

  /**
   * Cache-through helper: returns cached value if present, otherwise calls
   * the loader function, caches the result, and returns it.
   */
  async getOrSet<T>(key: string, loader: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }
    const value = await loader()
    await this.set(key, value, ttl)
    return value
  },
}
