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

import { listSavedReports, getSavedReport, createSavedReport, updateSavedReport, deleteSavedReport } from '../../src/controllers/savedReport.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('savedReport.controller', () => {
  describe('listSavedReports', () => {
    it('returns saved reports', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.savedReport.findMany.mockResolvedValue([{ id: 'r1', name: 'Monthly' }] as any)

      await listSavedReports(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getSavedReport', () => {
    it('returns report by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'r1' })
      mockPrisma.savedReport.findFirst.mockResolvedValue({ id: 'r1', name: 'Report' } as any)

      await getSavedReport(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 for missing report', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.savedReport.findFirst.mockResolvedValue(null)

      await getSavedReport(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createSavedReport', () => {
    it('creates report and returns 201', async () => {
      const { req, res } = mockReqRes({}, { name: 'New Report', config: { type: 'bar' } })
      mockPrisma.savedReport.create.mockResolvedValue({ id: 'r1' } as any)

      await createSavedReport(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateSavedReport', () => {
    it('updates report', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 'r1' })
      mockPrisma.savedReport.findFirst.mockResolvedValue({ id: 'r1' } as any)
      mockPrisma.savedReport.update.mockResolvedValue({ id: 'r1', name: 'Updated' } as any)

      await updateSavedReport(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteSavedReport', () => {
    it('deletes report', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'r1' })
      mockPrisma.savedReport.findFirst.mockResolvedValue({ id: 'r1' } as any)
      mockPrisma.savedReport.delete.mockResolvedValue({ id: 'r1' } as any)

      await deleteSavedReport(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
