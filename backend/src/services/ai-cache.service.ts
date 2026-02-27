/**
 * AI Response Cache Service
 *
 * In-memory cache with configurable TTL per category.
 * Prevents redundant OpenAI calls for identical requests within a time window.
 *
 * Cache categories & default TTLs:
 *   - expensive_answer : 24h  (market stats, policy explanations, mortgage rates)
 *   - web_search       :  6h  (web research results)
 *   - content          :  1h  (same content type for same lead within 1h)
 *   - scoring          : 15m  (lead score re-requests)
 *
 * Also implements request de-duplication: if the same prompt is in-flight,
 * the second caller awaits the first result instead of making another API call.
 */

import crypto from 'crypto'

// ───────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────

export type CacheCategory = 'expensive_answer' | 'web_search' | 'content' | 'scoring'

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
  category: CacheCategory
  hits: number
}

interface CacheStats {
  totalEntries: number
  hitCount: number
  missCount: number
  byCategory: Record<CacheCategory, number>
}

// ───────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────

const DEFAULT_TTL_MS: Record<CacheCategory, number> = {
  expensive_answer: 24 * 60 * 60 * 1000, // 24 hours
  web_search: 6 * 60 * 60 * 1000,        //  6 hours
  content: 1 * 60 * 60 * 1000,           //  1 hour
  scoring: 15 * 60 * 1000,               // 15 minutes
}

const MAX_CACHE_SIZE = 2000 // Max entries before eviction

// ───────────────────────────────────────────────────
// In-flight de-duplication
// ───────────────────────────────────────────────────

const inFlight = new Map<string, Promise<unknown>>()

// ───────────────────────────────────────────────────
// Cache store
// ───────────────────────────────────────────────────

const cache = new Map<string, CacheEntry>()
let hitCount = 0
let missCount = 0

/**
 * Build a deterministic cache key from category + orgId + arbitrary content.
 */
export function buildCacheKey(category: CacheCategory, organizationId: string, content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 24)
  return `${category}:${organizationId}:${hash}`
}

/**
 * Check cache for a hit. Returns the cached value or undefined.
 */
export function getCached<T = unknown>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) {
    missCount++
    return undefined
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    missCount++
    return undefined
  }

  entry.hits++
  hitCount++
  return entry.value as T
}

/**
 * Store a value in the cache.
 */
export function setCache<T = unknown>(key: string, value: T, category: CacheCategory, ttlMs?: number): void {
  // Evict if at capacity (LRU-ish: remove oldest expired, then least-hit)
  if (cache.size >= MAX_CACHE_SIZE) {
    evictEntries()
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + (ttlMs ?? DEFAULT_TTL_MS[category]),
    category,
    hits: 0,
  })
}

/**
 * Wrapper: get-or-compute with automatic de-duplication.
 *
 * If the key is cached, return immediately.
 * If the same key is already being computed (in-flight), await that promise.
 * Otherwise, run the factory, cache the result, and return.
 */
export async function getOrCompute<T>(
  key: string,
  category: CacheCategory,
  factory: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  // 1. Cache hit
  const cached = getCached<T>(key)
  if (cached !== undefined) {
    return cached
  }

  // 2. De-duplicate: same key in flight?
  const existing = inFlight.get(key)
  if (existing) {
    return (await existing) as T
  }

  // 3. Compute
  const promise = factory()
  inFlight.set(key, promise)

  try {
    const value = await promise
    setCache(key, value, category, ttlMs)
    return value
  } finally {
    inFlight.delete(key)
  }
}

/**
 * Invalidate a specific key.
 */
export function invalidateCache(key: string): boolean {
  return cache.delete(key)
}

/**
 * Invalidate all keys matching a category (and optionally an orgId prefix).
 */
export function invalidateByCategory(category: CacheCategory, organizationId?: string): number {
  const prefix = organizationId ? `${category}:${organizationId}:` : `${category}:`
  let removed = 0
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
      removed++
    }
  }
  return removed
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): CacheStats {
  const byCategory: Record<CacheCategory, number> = {
    expensive_answer: 0,
    web_search: 0,
    content: 0,
    scoring: 0,
  }

  const now = Date.now()
  for (const entry of cache.values()) {
    if (entry.expiresAt > now) {
      byCategory[entry.category]++
    }
  }

  return {
    totalEntries: cache.size,
    hitCount,
    missCount,
    byCategory,
  }
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cache.clear()
  hitCount = 0
  missCount = 0
}

// ───────────────────────────────────────────────────
// Internal: eviction
// ───────────────────────────────────────────────────

function evictEntries(): void {
  const now = Date.now()

  // Pass 1: remove all expired
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }

  // Pass 2: if still over limit, remove least-hit entries
  if (cache.size >= MAX_CACHE_SIZE) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].hits - b[1].hits)
    const toRemove = Math.max(sorted.length - MAX_CACHE_SIZE + 200, 100) // free up headroom
    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      cache.delete(sorted[i][0])
    }
  }
}
