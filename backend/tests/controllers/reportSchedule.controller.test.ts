import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { listReportSchedules, createReportSchedule, updateReportSchedule, deleteReportSchedule } from '../../src/controllers/reportSchedule.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('reportSchedule.controller', () => {
  describe('listReportSchedules', () => {
    it('returns report schedules', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.reportSchedule.findMany.mockResolvedValue([
        { id: 'rs1', frequency: 'DAILY', recipients: ['a@test.com'] },
      ] as any)

      await listReportSchedules(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createReportSchedule', () => {
    it('creates report schedule', async () => {
      const { req, res } = mockReqRes({}, {
        savedReportId: 'sr1', frequency: 'DAILY',
        recipients: ['a@test.com'], timeOfDay: '09:00', timezone: 'America/New_York',
      })
      mockPrisma.savedReport.findFirst.mockResolvedValue({ id: 'sr1' } as any)
      mockPrisma.reportSchedule.create.mockResolvedValue({ id: 'rs1' } as any)

      await createReportSchedule(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateReportSchedule', () => {
    it('updates report schedule', async () => {
      const { req, res } = mockReqRes({}, { frequency: 'WEEKLY' }, { id: 'rs1' })
      mockPrisma.reportSchedule.findFirst.mockResolvedValue({
        id: 'rs1', frequency: 'DAILY', timeOfDay: '09:00', timezone: 'America/New_York',
        customInterval: null, dayOfWeek: null, dayOfMonth: null,
      } as any)
      mockPrisma.reportSchedule.update.mockResolvedValue({ id: 'rs1', frequency: 'WEEKLY' } as any)

      await updateReportSchedule(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, { frequency: 'WEEKLY' }, { id: 'bad' })
      mockPrisma.reportSchedule.findFirst.mockResolvedValue(null)

      await updateReportSchedule(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('deleteReportSchedule', () => {
    it('deletes report schedule', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'rs1' })
      mockPrisma.reportSchedule.findFirst.mockResolvedValue({ id: 'rs1' } as any)
      mockPrisma.reportSchedule.delete.mockResolvedValue({ id: 'rs1' } as any)

      await deleteReportSchedule(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
