jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
jest.mock('../../src/services/emailDeliverability.service', () => ({
  recordBounce: jest.fn().mockResolvedValue(undefined),
  recordSpamComplaint: jest.fn().mockResolvedValue(undefined),
  getCampaignDeliverability: jest.fn().mockResolvedValue({ bounceRate: 2, spamRate: 0.1 }),
  getOverallDeliverability: jest.fn().mockResolvedValue({ bounceRate: 3, deliveryRate: 97 }),
  retryFailedMessage: jest.fn().mockResolvedValue({ success: true }),
  batchRetryMessages: jest.fn().mockResolvedValue({ retried: 5 }),
  getRetryableMessages: jest.fn().mockResolvedValue([]),
  getBounceReport: jest.fn().mockResolvedValue({ total: 10, hard: 3, soft: 7 }),
  getSuppressedEmails: jest.fn().mockResolvedValue([]),
}))

import { getStats, getRetryable, retryMessage, getSuppressed } from '../../src/controllers/deliverability.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

describe('deliverability.controller', () => {
  describe('getStats', () => {
    it('returns deliverability stats', async () => {
      const { req, res } = mockReqRes()

      await getStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getRetryable', () => {
    it('returns retryable messages', async () => {
      const { req, res } = mockReqRes()

      await getRetryable(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('retryMessage', () => {
    it('retries failed message', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'm1' })

      await retryMessage(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getSuppressed', () => {
    it('returns suppressed emails', async () => {
      const { req, res } = mockReqRes()

      await getSuppressed(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
