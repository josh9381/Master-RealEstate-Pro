import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockExportToResponse = jest.fn().mockResolvedValue(undefined)
jest.mock('../../src/services/export.service', () => ({
  exportToResponse: mockExportToResponse,
}))

import { exportData } from '../../src/controllers/export.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: {
      status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(), end: jest.fn(),
    } as any,
  }
}

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('export.controller', () => {
  describe('exportData', () => {
    it('exports leads data', async () => {
      const { req, res } = mockReqRes({ format: 'csv' }, {}, { type: 'leads' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' } as any)

      await exportData(req, res)

      expect(mockExportToResponse).toHaveBeenCalled()
    })

    it('returns 403 for non-admin users', async () => {
      const { req, res } = mockReqRes({ format: 'csv' }, {}, { type: 'leads' })
      req.user.role = 'AGENT'
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'AGENT' } as any)

      await exportData(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})
