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

jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: () => ({
    chat: jest.fn().mockResolvedValue({ response: 'AI insight', tokens: 100, cost: 0.002 }),
  }),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcPercentChange: jest.fn().mockReturnValue(10),
  calcRate: jest.fn().mockReturnValue(50),
  calcRateClamped: jest.fn().mockReturnValue(50),
}))

import { IntelligenceService } from '../../src/services/intelligence.service'

describe('intelligence.service', () => {
  let service: IntelligenceService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new IntelligenceService()
  })

  describe('predictLeadConversion', () => {
    it('throws when lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null)
      await expect(service.predictLeadConversion('bad-id')).rejects.toThrow(/not found/i)
    })

    it('predicts conversion for a lead with activities', async () => {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead1',
        score: 75,
        status: 'QUALIFIED',
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        activities: [
          { id: 'a1', type: 'EMAIL', createdAt: weekAgo },
          { id: 'a2', type: 'CALL', createdAt: weekAgo },
          { id: 'a3', type: 'NOTE', createdAt: now },
        ],
      } as any)

      const result = await service.predictLeadConversion('lead1')
      expect(result).toHaveProperty('conversionProbability')
      expect(result.conversionProbability).toBeGreaterThanOrEqual(0)
      expect(result.conversionProbability).toBeLessThanOrEqual(100)
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasoning')
      expect(result.leadId).toBe('lead1')
    })

    it('uses personalized weights when userId provided', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead1',
        score: 80,
        status: 'CONTACTED',
        createdAt: new Date(),
        activities: [],
      } as any)
      mockPrisma.leadScoringModel.findUnique.mockResolvedValue({
        userId: 'user1',
        factors: {
          scoreWeight: 0.5,
          activityWeight: 0.2,
          recencyWeight: 0.2,
          funnelTimeWeight: 0.1,
        },
      } as any)

      const result = await service.predictLeadConversion('lead1', 'user1')
      expect(result).toHaveProperty('conversionProbability')
    })
  })
})
