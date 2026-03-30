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
jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}))

import { getActivities, getActivity, createActivity, getActivityStats } from '../../src/controllers/activity.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('activity.controller', () => {
  describe('getActivities', () => {
    it('returns paginated activities', async () => {
      const { req, res } = mockReqRes({ page: '1', limit: '10' })
      mockPrisma.activity.findMany.mockResolvedValue([{ id: 'a1', type: 'EMAIL_SENT' }] as any)
      mockPrisma.activity.count.mockResolvedValue(1)

      await getActivities(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
      expect(mockPrisma.activity.findMany).toHaveBeenCalled()
    })

    it('applies type filter', async () => {
      const { req, res } = mockReqRes({ type: 'EMAIL_SENT' })
      mockPrisma.activity.findMany.mockResolvedValue([])
      mockPrisma.activity.count.mockResolvedValue(0)

      await getActivities(req, res)

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: 'EMAIL_SENT' }) })
      )
    })
  })

  describe('getActivity', () => {
    it('returns activity by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'a1' })
      mockPrisma.activity.findUnique.mockResolvedValue({ id: 'a1', organizationId: 'org-1' } as any)

      await getActivity(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing activity', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.activity.findUnique.mockResolvedValue(null)

      await expect(getActivity(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createActivity', () => {
    it('creates activity and returns 201', async () => {
      const { req, res } = mockReqRes({}, { type: 'NOTE_ADDED', title: 'Added note' })
      mockPrisma.activity.create.mockResolvedValue({ id: 'a1', type: 'NOTE_ADDED' } as any)

      await createActivity(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('getActivityStats', () => {
    it('returns aggregated stats', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.activity.groupBy.mockResolvedValue([
        { type: 'EMAIL_SENT', _count: { _all: 5 } },
      ] as any)
      mockPrisma.activity.count.mockResolvedValue(5)

      await getActivityStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
