import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockIntelligenceService = {
  calculateLeadScore: jest.fn().mockResolvedValue({ score: 85, factors: [], confidence: 0.9 }),
  getDataQuality: jest.fn().mockResolvedValue({ completeness: 85, accuracy: 90, consistency: 88 }),
}
jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: jest.fn(() => mockIntelligenceService),
}))
jest.mock('../../src/services/leadScoring.service', () => ({
  getLeadScoreBreakdown: jest.fn().mockResolvedValue({ total: 85, factors: [] }),
  updateMultipleLeadScores: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../src/services/usage-tracking.service', () => ({
  incrementAIUsage: jest.fn(),
}))
jest.mock('../../src/services/ml-optimization.service', () => ({
  getMLOptimizationService: jest.fn(() => ({
    trainModel: jest.fn().mockResolvedValue(undefined),
  })),
}))

import { getModelPerformance, getLeadScore, getDataQuality } from '../../src/controllers/ai-scoring.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('ai-scoring.controller', () => {
  describe('getModelPerformance', () => {
    it('returns model performance metrics', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.modelPerformanceHistory.findMany.mockResolvedValue([])
      mockPrisma.leadScoringModel.findMany.mockResolvedValue([])

      await getModelPerformance(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getLeadScore', () => {
    it('returns lead score', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'lead1' })

      await getLeadScore(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      expect(mockIntelligenceService.calculateLeadScore).toHaveBeenCalledWith('lead1')
    })
  })

  describe('getDataQuality', () => {
    it('returns data quality metrics', async () => {
      const { req, res } = mockReqRes()

      await getDataQuality(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
