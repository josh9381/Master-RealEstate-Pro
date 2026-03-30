import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockGetVapidPublicKey = jest.fn().mockReturnValue('test-public-key')
jest.mock('../../src/services/pushNotification.service', () => ({
  getVapidPublicKey: mockGetVapidPublicKey,
}))

import { getPublicKey, subscribe, unsubscribe } from '../../src/controllers/pushSubscription.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: {
      query, body, params,
      user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' },
      ip: '127.0.0.1', headers: { 'user-agent': 'jest' },
      get: jest.fn(() => 'jest-agent'),
    } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('pushSubscription.controller', () => {
  describe('getPublicKey', () => {
    it('returns VAPID public key', async () => {
      const { req, res } = mockReqRes()

      await getPublicKey(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('subscribe', () => {
    it('creates push subscription', async () => {
      const { req, res } = mockReqRes({}, {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: { p256dh: 'testkey1', auth: 'testauth1' },
      })
      mockPrisma.pushSubscription.upsert.mockResolvedValue({ id: 'ps1' } as any)

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('unsubscribe', () => {
    it('removes push subscription', async () => {
      const { req, res } = mockReqRes({}, { endpoint: 'https://fcm.googleapis.com/fcm/send/test' })
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })

      await unsubscribe(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
