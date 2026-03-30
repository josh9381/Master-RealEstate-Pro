import {
  buildCacheKey,
  getCached,
  setCache,
  getOrCompute,
  invalidateCache,
  invalidateByCategory,
  getCacheStats,
  clearCache,
} from '../../src/services/ai-cache.service'

beforeEach(() => {
  clearCache()
})

describe('ai-cache.service', () => {
  describe('buildCacheKey', () => {
    it('builds deterministic key from category, orgId, content', () => {
      const key1 = buildCacheKey('scoring', 'org-1', 'some prompt')
      const key2 = buildCacheKey('scoring', 'org-1', 'some prompt')
      expect(key1).toBe(key2)
      expect(key1).toMatch(/^scoring:org-1:/)
    })

    it('produces different keys for different orgs', () => {
      const key1 = buildCacheKey('scoring', 'org-1', 'prompt')
      const key2 = buildCacheKey('scoring', 'org-2', 'prompt')
      expect(key1).not.toBe(key2)
    })

    it('produces different keys for different categories', () => {
      const key1 = buildCacheKey('scoring', 'org-1', 'prompt')
      const key2 = buildCacheKey('content', 'org-1', 'prompt')
      expect(key1).not.toBe(key2)
    })

    it('throws when organizationId is missing', () => {
      expect(() => buildCacheKey('scoring', '', 'prompt')).toThrow(/Organization ID/)
    })

    it('throws when organizationId is "undefined"', () => {
      expect(() => buildCacheKey('scoring', 'undefined', 'prompt')).toThrow(/Organization ID/)
    })

    it('throws when organizationId is "null"', () => {
      expect(() => buildCacheKey('scoring', 'null', 'prompt')).toThrow(/Organization ID/)
    })
  })

  describe('getCached / setCache', () => {
    it('returns undefined for cache miss', () => {
      expect(getCached('nonexistent')).toBeUndefined()
    })

    it('stores and retrieves a value', () => {
      setCache('key1', { answer: 42 }, 'scoring')
      expect(getCached('key1')).toEqual({ answer: 42 })
    })

    it('returns undefined for expired entries', () => {
      setCache('key2', 'data', 'scoring', 1) // 1ms TTL
      // Wait for expiry
      const start = Date.now()
      while (Date.now() - start < 10) {} // busy-wait 10ms
      expect(getCached('key2')).toBeUndefined()
    })
  })

  describe('getOrCompute', () => {
    it('calls factory on cache miss and caches result', async () => {
      const factory = jest.fn().mockResolvedValue('computed-value')
      const result = await getOrCompute('key', 'content', factory)
      expect(result).toBe('computed-value')
      expect(factory).toHaveBeenCalledTimes(1)

      // Second call should hit cache
      const result2 = await getOrCompute('key', 'content', factory)
      expect(result2).toBe('computed-value')
      expect(factory).toHaveBeenCalledTimes(1)
    })

    it('deduplicates in-flight requests', async () => {
      let resolveFactory!: (v: string) => void
      const factory = jest.fn().mockImplementation(
        () => new Promise<string>(resolve => { resolveFactory = resolve })
      )

      const p1 = getOrCompute('dedup', 'scoring', factory)
      const p2 = getOrCompute('dedup', 'scoring', factory)
      resolveFactory('shared-result')

      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBe('shared-result')
      expect(r2).toBe('shared-result')
      expect(factory).toHaveBeenCalledTimes(1)
    })
  })

  describe('invalidateCache', () => {
    it('removes a specific key', () => {
      setCache('k1', 'v1', 'scoring')
      expect(invalidateCache('k1')).toBe(true)
      expect(getCached('k1')).toBeUndefined()
    })

    it('returns false for nonexistent key', () => {
      expect(invalidateCache('nope')).toBe(false)
    })
  })

  describe('invalidateByCategory', () => {
    it('removes all entries for a category', () => {
      const k1 = buildCacheKey('scoring', 'org-1', 'a')
      const k2 = buildCacheKey('scoring', 'org-1', 'b')
      const k3 = buildCacheKey('content', 'org-1', 'c')
      setCache(k1, 1, 'scoring')
      setCache(k2, 2, 'scoring')
      setCache(k3, 3, 'content')

      const removed = invalidateByCategory('scoring')
      expect(removed).toBe(2)
      expect(getCached(k3)).toBe(3)
    })

    it('scopes by org when provided', () => {
      const k1 = buildCacheKey('scoring', 'org-1', 'a')
      const k2 = buildCacheKey('scoring', 'org-2', 'b')
      setCache(k1, 1, 'scoring')
      setCache(k2, 2, 'scoring')

      const removed = invalidateByCategory('scoring', 'org-1')
      expect(removed).toBe(1)
      expect(getCached(k2)).toBe(2)
    })
  })

  describe('getCacheStats', () => {
    it('tracks hits and misses', () => {
      setCache('s1', 'v', 'scoring')
      getCached('s1') // hit
      getCached('s1') // hit
      getCached('miss') // miss

      const stats = getCacheStats()
      expect(stats.totalEntries).toBe(1)
      expect(stats.hitCount).toBeGreaterThanOrEqual(2)
      expect(stats.missCount).toBeGreaterThanOrEqual(1)
      expect(stats.byCategory.scoring).toBe(1)
    })
  })

  describe('clearCache', () => {
    it('removes all entries and resets counters', () => {
      setCache('a', 1, 'scoring')
      setCache('b', 2, 'content')
      clearCache()
      const stats = getCacheStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.hitCount).toBe(0)
      expect(stats.missCount).toBe(0)
    })
  })
})
