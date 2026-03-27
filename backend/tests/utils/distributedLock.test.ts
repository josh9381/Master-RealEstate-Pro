jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn(),
}))

import { getRedisClient, isRedisConnected } from '../../src/config/redis'
import { acquireLock, releaseLock } from '../../src/utils/distributedLock'

const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getRedisClient as jest.Mock).mockReturnValue(mockRedis)
  ;(isRedisConnected as jest.Mock).mockReturnValue(true)
})

describe('distributedLock', () => {
  describe('acquireLock', () => {
    it('returns true when lock acquired (redis returns OK)', async () => {
      mockRedis.set.mockResolvedValue('OK')
      const result = await acquireLock('my-lock')
      expect(result).toBe(true)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'my-lock', expect.anything(), 'EX', 60, 'NX'
      )
    })

    it('returns false when lock is already held (redis returns null)', async () => {
      mockRedis.set.mockResolvedValue(null)
      const result = await acquireLock('my-lock')
      expect(result).toBe(false)
    })

    it('uses custom TTL', async () => {
      mockRedis.set.mockResolvedValue('OK')
      await acquireLock('my-lock', 120)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'my-lock', expect.anything(), 'EX', 120, 'NX'
      )
    })

    it('fails open (returns true) when redis is unavailable', async () => {
      ;(getRedisClient as jest.Mock).mockReturnValue(null)
      const result = await acquireLock('my-lock')
      expect(result).toBe(true)
    })

    it('fails open (returns true) when redis throws', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis down'))
      const result = await acquireLock('my-lock')
      expect(result).toBe(true)
    })
  })

  describe('releaseLock', () => {
    it('deletes the lock key', async () => {
      mockRedis.del.mockResolvedValue(1)
      await releaseLock('my-lock')
      expect(mockRedis.del).toHaveBeenCalledWith('my-lock')
    })

    it('does not throw when redis throws', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis down'))
      await expect(releaseLock('my-lock')).resolves.toBeUndefined()
    })

    it('does nothing when redis is not connected', async () => {
      ;(getRedisClient as jest.Mock).mockReturnValue(null)
      await releaseLock('my-lock')
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })
})
