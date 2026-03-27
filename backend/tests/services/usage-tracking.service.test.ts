jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {
    organization: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn(), findUnique: jest.fn() },
    usageTracking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    chatMessage: { count: jest.fn() },
  },
}))
jest.mock('../../src/config/subscriptions', () => ({
  AI_PLAN_LIMITS: {
    STARTER: { maxMonthlyAIMessages: 50, maxContentGenerations: 10, maxComposeUses: 5, maxScoringRecalculations: 10, maxWebSearches: 5 },
    PROFESSIONAL: { maxMonthlyAIMessages: 200, maxContentGenerations: 50, maxComposeUses: 25, maxScoringRecalculations: 50, maxWebSearches: 25 },
    ELITE: { maxMonthlyAIMessages: 500, maxContentGenerations: 100, maxComposeUses: 50, maxScoringRecalculations: 100, maxWebSearches: 50 },
    TEAM: { maxMonthlyAIMessages: 1000, maxContentGenerations: 200, maxComposeUses: 100, maxScoringRecalculations: 200, maxWebSearches: 100 },
    ENTERPRISE: { maxMonthlyAIMessages: 'unlimited', maxContentGenerations: 'unlimited', maxComposeUses: 'unlimited', maxScoringRecalculations: 'unlimited', maxWebSearches: 'unlimited' },
  },
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import prisma from '../../src/config/database'
import { incrementAIUsage, getMonthlyUsage, checkUsageLimit } from '../../src/services/usage-tracking.service'

describe('usage-tracking.service', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('incrementAIUsage', () => {
    it('returns early when org has no subscription', async () => {
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

      await incrementAIUsage('org-1', 'aiMessages')

      expect(prisma.usageTracking.upsert).not.toHaveBeenCalled()
    })

    it('upserts usage tracking with subscription', async () => {
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' })
      ;(prisma.usageTracking.upsert as jest.Mock).mockResolvedValue({})

      await incrementAIUsage('org-1', 'aiMessages')

      expect(prisma.usageTracking.upsert).toHaveBeenCalled()
    })
  })

  describe('getMonthlyUsage', () => {
    it('returns zero defaults when no subscription', async () => {
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getMonthlyUsage('org-1')

      expect(result.aiMessages).toBe(0)
      expect(result.contentGenerations).toBe(0)
      expect(result.totalCost).toBe(0)
    })

    it('returns tracked usage values', async () => {
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' })
      ;(prisma.usageTracking.findUnique as jest.Mock).mockResolvedValue({
        aiMessages: 42,
        contentGenerations: 8,
        composeUses: 3,
        scoringRecalculations: 5,
        webSearches: 2,
        callMinutes: 0,
        enhancements: 7,
        totalTokensUsed: 50000,
        totalCost: 1.5,
      })

      const result = await getMonthlyUsage('org-1')

      expect(result.aiMessages).toBe(42)
      expect(result.totalCost).toBe(1.5)
    })
  })

  describe('checkUsageLimit', () => {
    it('returns allowed: true, unlimited for own-key orgs (non-scoring)', async () => {
      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        subscriptionTier: 'STARTER',
        useOwnAIKey: true,
        openaiApiKey: 'enc:somekey',
        Subscription: { id: 'sub-1' },
      })

      const result = await checkUsageLimit('org-1', 'aiMessages')

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe('unlimited')
      expect(result.useOwnKey).toBe(true)
    })

    it('returns not allowed when monthly limit exceeded', async () => {
      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        subscriptionTier: 'STARTER',
        useOwnAIKey: false,
        openaiApiKey: null,
        Subscription: { id: 'sub-1' },
      })
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' })
      ;(prisma.usageTracking.findUnique as jest.Mock).mockResolvedValue({
        aiMessages: 50,
        contentGenerations: 0,
        composeUses: 0,
        scoringRecalculations: 0,
        webSearches: 0,
        enhancements: 0,
        callMinutes: 0,
        totalTokensUsed: 0,
        totalCost: 0,
      })

      const result = await checkUsageLimit('org-1', 'aiMessages')

      expect(result.allowed).toBe(false)
      expect(result.used).toBe(50)
      expect(result.tier).toBe('STARTER')
    })

    it('returns allowed when under limit', async () => {
      ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        subscriptionTier: 'PROFESSIONAL',
        useOwnAIKey: false,
        openaiApiKey: null,
        Subscription: { id: 'sub-1' },
      })
      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-1' })
      ;(prisma.usageTracking.findUnique as jest.Mock).mockResolvedValue({
        aiMessages: 50,
        contentGenerations: 0,
        composeUses: 0,
        scoringRecalculations: 0,
        webSearches: 0,
        enhancements: 0,
        callMinutes: 0,
        totalTokensUsed: 0,
        totalCost: 0,
      })

      const result = await checkUsageLimit('org-1', 'aiMessages')

      expect(result.allowed).toBe(true)
      expect(result.used).toBe(50)
      expect(result.tier).toBe('PROFESSIONAL')
    })
  })
})
