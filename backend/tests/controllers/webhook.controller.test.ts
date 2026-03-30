import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/services/campaignAnalytics.service', () => ({
  trackEmailOpen: jest.fn(),
  trackEmailClick: jest.fn(),
}))
jest.mock('../../src/services/email.service', () => ({
  suppressEmail: jest.fn(),
}))
jest.mock('../../src/utils/useragent', () => ({
  parseUserAgent: jest.fn().mockReturnValue({ browser: 'Chrome', os: 'Windows' }),
}))
jest.mock('../../src/utils/geoip', () => ({
  lookupGeo: jest.fn().mockReturnValue(null),
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))
jest.mock('../../src/config/socket', () => ({
  pushNotification: jest.fn(),
  pushMessageUpdate: jest.fn(),
}))

import { handleTwilioStatus, handleSendGridEvent } from '../../src/controllers/webhook.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: {
      query, body, params,
      user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' },
      ip: '127.0.0.1', headers: { 'user-agent': 'jest' },
      get: jest.fn(() => 'jest'),
    } as any,
    res: {
      status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(),
    } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('webhook.controller', () => {
  describe('handleTwilioStatus', () => {
    it('processes SMS status update', async () => {
      const { req, res } = mockReqRes({}, {
        MessageSid: 'SM123', MessageStatus: 'delivered',
      })
      mockPrisma.message.findFirst.mockResolvedValue({ id: 'm1', messageSid: 'SM123' } as any)
      mockPrisma.message.update.mockResolvedValue({ id: 'm1', status: 'DELIVERED' } as any)

      await handleTwilioStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('handleSendGridEvent', () => {
    it('processes sendgrid events', async () => {
      const { req, res } = mockReqRes({}, [
        { email: 'test@example.com', event: 'delivered', sg_message_id: 'sg123', timestamp: Date.now() / 1000 },
      ])

      // Mock the message lookup for each event
      mockPrisma.message.findFirst.mockResolvedValue({ id: 'm1', campaignId: null } as any)
      mockPrisma.message.update.mockResolvedValue({ id: 'm1' } as any)

      await handleSendGridEvent(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })
})
