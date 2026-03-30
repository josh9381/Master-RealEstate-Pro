import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockIntelligenceService = {
  predictLeadConversion: jest.fn().mockResolvedValue({ score: 80, confidence: 0.9, factors: [] }),
  analyzeLeadEngagement: jest.fn().mockResolvedValue({ level: 'HIGH', score: 85, interactions: [] }),
  suggestNextAction: jest.fn().mockResolvedValue({ action: 'Send email', reason: 'Not contacted recently', priority: 'HIGH' }),
  generateInsights: jest.fn().mockResolvedValue({ trends: [], summary: { totalLeads: 100 } }),
}
jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: jest.fn(() => mockIntelligenceService),
}))

const mockMLService = {
  optimizeScoringWeights: jest.fn().mockResolvedValue({ improved: true }),
  recordConversionOutcome: jest.fn().mockResolvedValue(undefined),
  getScoringModel: jest.fn().mockResolvedValue(null),
}
jest.mock('../../src/services/ml-optimization.service', () => ({
  getMLOptimizationService: jest.fn(() => mockMLService),
}))

import { getLeadPrediction, getLeadEngagement, getNextAction, getDashboardInsights } from '../../src/controllers/intelligence.controller'

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

describe('intelligence.controller', () => {
  describe('getLeadPrediction', () => {
    it('returns prediction', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'lead1' })
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead1', firstName: 'John', organizationId: 'org-1' } as any)

      await getLeadPrediction(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      expect(mockIntelligenceService.predictLeadConversion).toHaveBeenCalledWith('lead1', 'u1')
    })

    it('returns 404 when lead not found', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.lead.findUnique.mockResolvedValue(null)

      await getLeadPrediction(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('getLeadEngagement', () => {
    it('returns engagement data', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'lead1' })
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead1', organizationId: 'org-1' } as any)

      await getLeadEngagement(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      expect(mockIntelligenceService.analyzeLeadEngagement).toHaveBeenCalledWith('lead1')
    })
  })

  describe('getNextAction', () => {
    it('returns next best action', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'lead1' })
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead1', organizationId: 'org-1' } as any)

      await getNextAction(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getDashboardInsights', () => {
    it('returns dashboard insights', async () => {
      const { req, res } = mockReqRes()

      await getDashboardInsights(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      expect(mockIntelligenceService.generateInsights).toHaveBeenCalledWith('org-1')
    })
  })
})
