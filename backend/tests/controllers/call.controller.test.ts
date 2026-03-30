import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/config/socket', () => ({
  pushCallUpdate: jest.fn(),
}))
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { logCall, getCalls, getCall, updateCall, deleteCall, getTodayStats } from '../../src/controllers/call.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('call.controller', () => {
  describe('logCall', () => {
    it('logs a call', async () => {
      const { req, res } = mockReqRes({}, {
        leadId: 'lead1', phoneNumber: '+15551234567', direction: 'OUTBOUND', outcome: 'ANSWERED', duration: 120,
      })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1', firstName: 'John', lastName: 'Doe' } as any)
      mockPrisma.call.create.mockResolvedValue({ id: 'c1', leadId: 'lead1', outcome: 'ANSWERED' } as any)
      mockPrisma.activity.create.mockResolvedValue({ id: 'a1' } as any)

      await logCall(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws NotFoundError when lead missing', async () => {
      const { req, res } = mockReqRes({}, {
        leadId: 'bad', phoneNumber: '+15551234567', direction: 'OUTBOUND', outcome: 'ANSWERED',
      })
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      await expect(logCall(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('getCalls', () => {
    it('returns calls', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.call.findMany.mockResolvedValue([{ id: 'c1' }] as any)
      mockPrisma.call.count.mockResolvedValue(1)

      await getCalls(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getCall', () => {
    it('returns call by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'c1' })
      mockPrisma.call.findFirst.mockResolvedValue({ id: 'c1', leadId: 'lead1' } as any)

      await getCall(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateCall', () => {
    it('updates call', async () => {
      const { req, res } = mockReqRes({}, { notes: 'Updated notes' }, { id: 'c1' })
      mockPrisma.call.findFirst.mockResolvedValue({ id: 'c1' } as any)
      mockPrisma.call.update.mockResolvedValue({ id: 'c1', notes: 'Updated notes' } as any)

      await updateCall(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteCall', () => {
    it('deletes call', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'c1' })
      mockPrisma.call.findFirst.mockResolvedValue({ id: 'c1' } as any)
      mockPrisma.call.delete.mockResolvedValue({ id: 'c1' } as any)

      await deleteCall(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getTodayStats', () => {
    it('returns today call stats', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.call.count.mockResolvedValue(5)
      mockPrisma.call.groupBy.mockResolvedValue([
        { outcome: 'ANSWERED', _count: { id: 3 } },
      ] as any)
      mockPrisma.call.aggregate.mockResolvedValue({ _avg: { duration: 120 }, _sum: { duration: 600 } } as any)

      await getTodayStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
