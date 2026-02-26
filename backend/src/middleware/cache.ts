import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/cache.service'

/**
 * Express middleware that caches the JSON response for GET requests.
 *
 * Usage:
 *   router.get('/dashboard', cacheResponse(120), getDashboardStats)
 *
 * The cache key is derived from:  orgId + url + sorted query params
 * So each organisation and each filter combination gets its own entry.
 *
 * @param ttl  Cache TTL in seconds (default 120 = 2 min)
 */
export function cacheResponse(ttl = 120) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next()

    const orgId = (req as any).user?.organizationId || 'anon'
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map((k) => `${k}=${req.query[k]}`)
      .join('&')
    const cacheKey = `api:${orgId}:${req.originalUrl.split('?')[0]}:${sortedQuery}`

    // Check cache
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached)
    }

    // Monkey-patch res.json to intercept the response data
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, body, ttl).catch(() => {})
      }
      res.setHeader('X-Cache', 'MISS')
      return originalJson(body)
    }

    next()
  }
}

/**
 * Middleware to invalidate cache for a specific route pattern after a mutation.
 * Attach to POST/PUT/PATCH/DELETE routes to clear stale cached data.
 *
 * Usage:
 *   router.post('/leads', invalidateCache('api:*:leads*'), createLead)
 */
export function invalidateCache(pattern: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const orgId = (req as any).user?.organizationId || 'anon'
    const expandedPattern = pattern.replace('*:*:', `*:${orgId}:`)
    // Do this after the handler succeeds — we hook into res.on('finish')
    _res.on('finish', () => {
      if (_res.statusCode >= 200 && _res.statusCode < 300) {
        cacheService.invalidatePattern(expandedPattern).catch(() => {})
      }
    })
    next()
  }
}
