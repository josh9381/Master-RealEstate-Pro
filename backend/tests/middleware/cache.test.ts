jest.mock('../../src/services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    invalidatePattern: jest.fn(),
  },
}))

import { cacheService } from '../../src/services/cache.service'
import { cacheResponse, invalidateCache } from '../../src/middleware/cache'

function makeMocks(method = 'GET', overrides: Record<string, any> = {}) {
  const req: any = {
    method,
    query: {},
    originalUrl: '/api/dashboard',
    user: { organizationId: 'org-1' },
    ...overrides,
  }
  const res: any = {
    setHeader: jest.fn(),
    json: jest.fn().mockReturnThis(),
    statusCode: 200,
    on: jest.fn(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('cacheResponse', () => {
  beforeEach(() => jest.clearAllMocks())

  it('skips non-GET requests', async () => {
    const middleware = cacheResponse(60)
    const { req, res, next } = makeMocks('POST')

    await middleware(req, res, next)

    expect(cacheService.get).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('returns cached data on HIT', async () => {
    ;(cacheService.get as jest.Mock).mockResolvedValue({ data: 'cached' })
    const middleware = cacheResponse(60)
    const { req, res, next } = makeMocks()

    await middleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT')
    expect(res.json).toHaveBeenCalledWith({ data: 'cached' })
    expect(next).not.toHaveBeenCalled()
  })

  it('patches res.json and calls next on MISS', async () => {
    ;(cacheService.get as jest.Mock).mockResolvedValue(null)
    const middleware = cacheResponse(120)
    const { req, res, next } = makeMocks()
    const originalJson = res.json

    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    // res.json should be patched
    expect(res.json).not.toBe(originalJson)
  })

  it('sorts query params for cache key consistency', async () => {
    ;(cacheService.get as jest.Mock).mockResolvedValue(null)
    const middleware = cacheResponse(60)
    const { req, res, next } = makeMocks('GET', {
      query: { z: '1', a: '2' },
      originalUrl: '/api/test?z=1&a=2',
    })

    await middleware(req, res, next)

    expect(cacheService.get).toHaveBeenCalledWith(
      expect.stringContaining('a=2&z=1')
    )
  })
})

describe('invalidateCache', () => {
  beforeEach(() => jest.clearAllMocks())

  it('registers a finish listener', async () => {
    const middleware = invalidateCache('api:*:leads*')
    const { req, res, next } = makeMocks('POST')

    await middleware(req, res, next)

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
    expect(next).toHaveBeenCalled()
  })
})
