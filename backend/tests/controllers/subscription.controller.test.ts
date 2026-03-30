import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/config/subscriptions', () => ({
  PLAN_FEATURES: { FREE: { maxUsers: 3, maxLeads: 100 }, PROFESSIONAL: { maxUsers: 10, maxLeads: 1000 } },
  getPlanFeatures: jest.fn((tier: string) => ({ maxUsers: 10, maxLeads: 1000 })),
  checkUsageLimit: jest.fn().mockReturnValue({ allowed: true }),
  getTrialDaysRemaining: jest.fn().mockReturnValue(0),
}))
jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(),
  getRequestContext: jest.fn().mockReturnValue({}),
}))
jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn().mockReturnValue(0),
  calcProgress: jest.fn().mockReturnValue(50),
}))

import { getAvailablePlans, getCurrentSubscription } from '../../src/controllers/subscription.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('subscription.controller', () => {
  describe('getAvailablePlans', () => {
    it('returns available plans', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', subscriptionTier: 'FREE', name: 'Test Org',
      } as any)

      await getAvailablePlans(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when org not found', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue(null)

      await getAvailablePlans(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('getCurrentSubscription', () => {
    it('returns current subscription info', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', subscriptionTier: 'FREE', name: 'Test Org', trialEndsAt: null,
      } as any)
      mockPrisma.user.count.mockResolvedValue(2)
      mockPrisma.lead.count.mockResolvedValue(50)
      mockPrisma.campaign.count.mockResolvedValue(3)
      mockPrisma.workflow.count.mockResolvedValue(1)

      await getCurrentSubscription(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
