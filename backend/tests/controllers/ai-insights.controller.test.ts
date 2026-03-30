import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn().mockReturnValue(0),
  calcGrowthRate: jest.fn().mockReturnValue(0),
}))

import { getInsightById, dismissInsight, actOnInsight } from '../../src/controllers/ai-insights.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('ai-insights.controller', () => {
  describe('getInsightById', () => {
    it('returns insight by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'ins1' })
      mockPrisma.aIInsight.findFirst.mockResolvedValue({
        id: 'ins1', type: 'LEAD_SCORING', title: 'High value lead detected',
        description: 'Lead shows strong buying signals', priority: 'HIGH',
      } as any)

      await getInsightById(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.aIInsight.findFirst.mockResolvedValue(null)

      await getInsightById(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('dismissInsight', () => {
    it('dismisses insight', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'ins1' })
      mockPrisma.aIInsight.findFirst.mockResolvedValue({ id: 'ins1', organizationId: 'org-1' } as any)
      mockPrisma.aIInsight.update.mockResolvedValue({ id: 'ins1', status: 'DISMISSED' } as any)

      await dismissInsight(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('actOnInsight', () => {
    it('records action on insight', async () => {
      const { req, res } = mockReqRes({}, { actionTaken: 'Contacted lead' }, { id: 'ins1' })
      mockPrisma.aIInsight.findFirst.mockResolvedValue({ id: 'ins1', organizationId: 'org-1' } as any)
      mockPrisma.aIInsight.update.mockResolvedValue({ id: 'ins1', status: 'ACTED_UPON' } as any)

      await actOnInsight(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
