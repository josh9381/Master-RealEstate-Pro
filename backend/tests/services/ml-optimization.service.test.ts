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

jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: () => ({
    predictLeadConversion: jest.fn().mockResolvedValue({
      conversionProbability: 70,
      confidence: 'high',
    }),
  }),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn().mockReturnValue(50),
  formatRate: jest.fn((v: number) => `${v}%`),
}))

import { MLOptimizationService, ScoringWeights } from '../../src/services/ml-optimization.service'

describe('ml-optimization.service', () => {
  let service: MLOptimizationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new MLOptimizationService()
  })

  describe('optimizeScoringWeights', () => {
    it('returns early with insufficient data (<20 leads)', async () => {
      mockPrisma.leadScoringModel.findUnique.mockResolvedValue(null)
      mockPrisma.lead.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `lead${i}`,
          status: 'WON',
          score: 50,
          activities: [],
          createdAt: new Date(),
        })) as any
      )

      const result = await service.optimizeScoringWeights('user1', 'org1')
      expect(result.sampleSize).toBe(5)
      expect(result.improvements).toContain('Insufficient data for optimization')
      expect(result.newWeights).toEqual(result.oldWeights)
    })

    it('optimizes weights with sufficient data', async () => {
      const now = new Date()
      const leads = Array.from({ length: 25 }, (_, i) => ({
        id: `lead${i}`,
        status: i < 15 ? 'WON' : 'LOST',
        score: 40 + i * 2,
        createdAt: new Date(now.getTime() - (30 + i) * 24 * 60 * 60 * 1000),
        activities: Array.from({ length: i % 10 }, (_, j) => ({
          id: `a${i}-${j}`,
          type: 'EMAIL',
          createdAt: new Date(now.getTime() - j * 24 * 60 * 60 * 1000),
        })),
      }))

      mockPrisma.leadScoringModel.findUnique.mockResolvedValue(null)
      mockPrisma.lead.findMany.mockResolvedValue(leads as any)
      mockPrisma.leadScoringModel.create.mockResolvedValue({} as any)

      const result = await service.optimizeScoringWeights('user1', 'org1')
      expect(result.sampleSize).toBe(25)
      expect(result.newWeights).toHaveProperty('scoreWeight')
      expect(result.newWeights).toHaveProperty('activityWeight')
      expect(result.newWeights).toHaveProperty('recencyWeight')
      expect(result.newWeights).toHaveProperty('funnelTimeWeight')
      // Weights should sum to approximately 1
      const sum = result.newWeights.scoreWeight + result.newWeights.activityWeight +
        result.newWeights.recencyWeight + result.newWeights.funnelTimeWeight
      expect(sum).toBeCloseTo(1.0, 1)
    })
  })
})
