import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { unsubscribe, resubscribe, getPreferences } from '../../src/controllers/unsubscribe.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('unsubscribe.controller', () => {
  describe('unsubscribe', () => {
    it('unsubscribes a lead', async () => {
      const { req, res } = mockReqRes({}, {}, { token: 'test-token' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1', unsubscribeToken: 'test-token' } as any)
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead1', isUnsubscribed: true } as any)

      await unsubscribe(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('resubscribe', () => {
    it('resubscribes a lead', async () => {
      const { req, res } = mockReqRes({}, {}, { token: 'test-token' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1', unsubscribeToken: 'test-token' } as any)
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead1', isUnsubscribed: false } as any)

      await resubscribe(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getPreferences', () => {
    it('returns preferences', async () => {
      const { req, res } = mockReqRes({}, {}, { token: 'test-token' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1', email: 'test@test.com', isUnsubscribed: false } as any)

      await getPreferences(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
