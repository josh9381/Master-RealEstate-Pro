import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'jest-mock-extended'

const mockPrisma = mockDeep<PrismaClient>()

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

const mockSendNotification = jest.fn()
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: (...args: any[]) => mockSendNotification(...args),
}))

// Set VAPID keys before import
process.env.VAPID_PUBLIC_KEY = 'test-public-key'
process.env.VAPID_PRIVATE_KEY = 'test-private-key'

import { getVapidPublicKey, sendPushToUser } from '../../src/services/pushNotification.service'

describe('pushNotification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getVapidPublicKey', () => {
    it('returns the VAPID public key', () => {
      const key = getVapidPublicKey()
      expect(typeof key).toBe('string')
    })
  })

  describe('sendPushToUser', () => {
    it('returns {sent: 0, failed: 0} when no subscriptions', async () => {
      mockPrisma.pushSubscription.findMany.mockResolvedValue([])
      const result = await sendPushToUser('user1', { title: 'Test', body: 'Hello' })
      expect(result).toEqual({ sent: 0, failed: 0 })
    })

    it('sends push to all user subscriptions', async () => {
      mockPrisma.pushSubscription.findMany.mockResolvedValue([
        { id: 's1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1', userId: 'user1' },
        { id: 's2', endpoint: 'https://push.example.com/2', p256dh: 'key2', auth: 'auth2', userId: 'user1' },
      ] as any)
      mockSendNotification.mockResolvedValue({})

      const result = await sendPushToUser('user1', { title: 'Test', body: 'Hello' })
      expect(result.sent).toBe(2)
      expect(result.failed).toBe(0)
      expect(mockSendNotification).toHaveBeenCalledTimes(2)
    })

    it('handles failed subscriptions and cleans up 410s', async () => {
      mockPrisma.pushSubscription.findMany.mockResolvedValue([
        { id: 's1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1', userId: 'user1' },
      ] as any)
      const error = new Error('Gone') as any
      error.statusCode = 410
      mockSendNotification.mockRejectedValue(error)
      mockPrisma.pushSubscription.delete.mockResolvedValue({} as any)

      const result = await sendPushToUser('user1', { title: 'Test', body: 'Hello' })
      expect(result.failed).toBe(1)
      expect(result.sent).toBe(0)
    })
  })
})
