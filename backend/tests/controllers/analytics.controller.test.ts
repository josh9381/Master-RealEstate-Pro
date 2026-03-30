import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getDashboardStats, getLeadAnalytics } from '../../src/controllers/analytics.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('analytics.controller', () => {
  describe('getDashboardStats', () => {
    it('returns dashboard statistics', async () => {
      const { req, res } = mockReqRes()
      // Mock all the counts the dashboard needs
      mockPrisma.lead.count.mockResolvedValue(100)
      mockPrisma.campaign.count.mockResolvedValue(10)
      mockPrisma.task.count.mockResolvedValue(25)
      mockPrisma.activity.count.mockResolvedValue(500)
      mockPrisma.activity.findMany.mockResolvedValue([])
      mockPrisma.lead.groupBy.mockResolvedValue([])
      mockPrisma.campaignAnalytics.findMany.mockResolvedValue([])
      mockPrisma.message.count.mockResolvedValue(200)
      mockPrisma.appointment.count.mockResolvedValue(15)
      mockPrisma.call.count.mockResolvedValue(50)
      mockPrisma.workflow.count.mockResolvedValue(5)
      mockPrisma.campaign.aggregate.mockResolvedValue({
        _sum: { sent: 100, delivered: 90, opened: 50, clicked: 20, converted: 5, revenue: 1000, spent: 200 },
        _avg: { roi: 5.0 },
      } as any)

      await getDashboardStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getLeadAnalytics', () => {
    it('returns lead analytics', async () => {
      const { req, res } = mockReqRes({ period: '30d' })
      mockPrisma.lead.count.mockResolvedValue(100)
      mockPrisma.lead.groupBy.mockResolvedValue([])
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.aggregate.mockResolvedValue({ _avg: { score: 75 } } as any)

      await getLeadAnalytics(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
