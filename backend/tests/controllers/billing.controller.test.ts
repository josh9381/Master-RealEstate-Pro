import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
jest.mock('../../src/services/stripe.service', () => ({
  getStripeService: jest.fn(() => ({
    createCheckoutSession: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
    createPortalSession: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
    getInvoices: jest.fn().mockResolvedValue([]),
    getPaymentMethods: jest.fn().mockResolvedValue([]),
  })),
}))
jest.mock('../../src/config/subscriptions', () => ({
  STRIPE_PRICE_IDS: { PRO: 'price_pro', ENTERPRISE: 'price_ent' },
  PLAN_FEATURES: { FREE: {}, PRO: {}, ENTERPRISE: {} },
}))

import { getSubscription, getInvoices } from '../../src/controllers/billing.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('billing.controller', () => {
  describe('getSubscription', () => {
    it('returns subscription info', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', subscriptionTier: 'FREE', stripeCustomerId: null,
      } as any)

      await getSubscription(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getInvoices', () => {
    it('returns invoices', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', stripeCustomerId: 'cus_test',
      } as any)

      await getInvoices(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
