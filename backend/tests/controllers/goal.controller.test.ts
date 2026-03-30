import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { listGoals, createGoal, updateGoal, deleteGoal, getGoal } from '../../src/controllers/goal.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('goal.controller', () => {
  describe('listGoals', () => {
    it('returns goals', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.goal.findMany.mockResolvedValue([{ id: 'g1', name: 'Q1 Leads', metricType: 'LEADS_GENERATED' }] as any)
      mockPrisma.goal.count.mockResolvedValue(1)
      // Metric calculation queries
      mockPrisma.lead.count.mockResolvedValue(50)
      mockPrisma.campaign.count.mockResolvedValue(5)
      mockPrisma.call.count.mockResolvedValue(10)
      mockPrisma.appointment.count.mockResolvedValue(3)
      mockPrisma.message.count.mockResolvedValue(20)

      await listGoals(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createGoal', () => {
    it('creates goal', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Goal', metricType: 'LEADS_GENERATED', targetValue: 100,
        startDate: '2026-01-01', endDate: '2026-12-31',
      })
      mockPrisma.goal.create.mockResolvedValue({ id: 'g1', name: 'New Goal' } as any)
      mockPrisma.lead.count.mockResolvedValue(10)

      await createGoal(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('getGoal', () => {
    it('returns goal by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'g1' })
      mockPrisma.goal.findFirst.mockResolvedValue({
        id: 'g1', name: 'Q1 Leads', metricType: 'LEADS_GENERATED', targetValue: 100,
        startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      } as any)
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1' } as any)
      mockPrisma.lead.count.mockResolvedValue(50)

      await getGoal(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.goal.findFirst.mockResolvedValue(null)

      await getGoal(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('updateGoal', () => {
    it('updates goal', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated Goal' }, { id: 'g1' })
      mockPrisma.goal.findFirst.mockResolvedValue({ id: 'g1' } as any)
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1', name: 'Updated Goal' } as any)

      await updateGoal(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteGoal', () => {
    it('deletes goal', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'g1' })
      mockPrisma.goal.findFirst.mockResolvedValue({ id: 'g1' } as any)
      mockPrisma.goal.delete.mockResolvedValue({ id: 'g1' } as any)

      await deleteGoal(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
