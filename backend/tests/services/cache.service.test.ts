jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn(),
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { debug: jest.fn() },
}))

import { getRedisClient, isRedisConnected } from '../../src/config/redis'
import { cacheService } from '../../src/services/cache.service'

const mockClient = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getRedisClient as jest.Mock).mockReturnValue(mockClient)
  ;(isRedisConnected as jest.Mock).mockReturnValue(true)
})

describe('cacheService', () => {
  describe('get', () => {
    it('returns parsed value on cache hit', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }))
      const result = await cacheService.get('test-key')
      expect(result).toEqual({ foo: 'bar' })
      expect(mockClient.get).toHaveBeenCalledWith('mrep:test-key')
    })

    it('returns null on cache miss', async () => {
      mockClient.get.mockResolvedValue(null)
      const result = await cacheService.get('test-key')
      expect(result).toBeNull()
    })

    it('returns null when redis is not connected', async () => {
      ;(isRedisConnected as jest.Mock).mockReturnValue(false)
      const result = await cacheService.get('test-key')
      expect(result).toBeNull()
      expect(mockClient.get).not.toHaveBeenCalled()
    })

    it('returns null when redis client is null', async () => {
      ;(getRedisClient as jest.Mock).mockReturnValue(null)
      const result = await cacheService.get('test-key')
      expect(result).toBeNull()
    })

    it('returns null on error', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis down'))
      const result = await cacheService.get('fail-key')
      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('sets value with default TTL', async () => {
      await cacheService.set('key', { data: 1 })
      expect(mockClient.setex).toHaveBeenCalledWith(
        'mrep:key',
        300,
        JSON.stringify({ data: 1 })
      )
    })

    it('sets value with custom TTL', async () => {
      await cacheService.set('key', 'hello', 60)
      expect(mockClient.setex).toHaveBeenCalledWith('mrep:key', 60, '"hello"')
    })

    it('does nothing when redis not connected', async () => {
      ;(isRedisConnected as jest.Mock).mockReturnValue(false)
      await cacheService.set('key', 'val')
      expect(mockClient.setex).not.toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('deletes key by name', async () => {
      await cacheService.del('key')
      expect(mockClient.del).toHaveBeenCalledWith('mrep:key')
    })

    it('does nothing when redis not connected', async () => {
      ;(isRedisConnected as jest.Mock).mockReturnValue(false)
      await cacheService.del('key')
      expect(mockClient.del).not.toHaveBeenCalled()
    })
  })

  describe('invalidatePattern', () => {
    it('scans and deletes matching keys', async () => {
      mockClient.scan
        .mockResolvedValueOnce(['0', ['mrep:api:org1:leads', 'mrep:api:org1:leads:1']])

      await cacheService.invalidatePattern('api:org1:leads*')

      expect(mockClient.scan).toHaveBeenCalled()
      expect(mockClient.del).toHaveBeenCalledWith('mrep:api:org1:leads', 'mrep:api:org1:leads:1')
    })

    it('does nothing when no keys match', async () => {
      mockClient.scan.mockResolvedValueOnce(['0', []])

      await cacheService.invalidatePattern('no-match*')

      expect(mockClient.del).not.toHaveBeenCalled()
    })
  })

  describe('getOrSet', () => {
    it('returns cached value without calling loader', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ cached: true }))
      const loader = jest.fn()

      const result = await cacheService.getOrSet('key', loader)

      expect(result).toEqual({ cached: true })
      expect(loader).not.toHaveBeenCalled()
    })

    it('calls loader and caches result on miss', async () => {
      mockClient.get.mockResolvedValue(null)
      const loader = jest.fn().mockResolvedValue({ fresh: true })

      const result = await cacheService.getOrSet('key', loader, 120)

      expect(result).toEqual({ fresh: true })
      expect(loader).toHaveBeenCalled()
      expect(mockClient.setex).toHaveBeenCalledWith('mrep:key', 120, JSON.stringify({ fresh: true }))
    })
  })
})
