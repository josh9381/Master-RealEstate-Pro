import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/config/upload', () => ({
  deleteUploadFile: jest.fn(),
  getUploadUrl: jest.fn((path: string) => `http://localhost/${path}`),
}))
jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn(),
}))
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { getDocuments, deleteDocument } from '../../src/controllers/document.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('document.controller', () => {
  describe('getDocuments', () => {
    it('returns documents for a lead', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'lead1' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1' } as any)
      mockPrisma.leadDocument.findMany.mockResolvedValue([
        { id: 'd1', filename: 'contract.pdf', filePath: 'docs/contract.pdf' },
      ] as any)

      await getDocuments(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when lead not found', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'bad' })
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      await getDocuments(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('deleteDocument', () => {
    it('deletes a document', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'lead1', documentId: 'd1' })
      mockPrisma.leadDocument.findFirst.mockResolvedValue({ id: 'd1', filePath: 'docs/contract.pdf', leadId: 'lead1' } as any)
      mockPrisma.leadDocument.delete.mockResolvedValue({ id: 'd1' } as any)

      await deleteDocument(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when document not found', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'lead1', documentId: 'bad' })
      mockPrisma.leadDocument.findFirst.mockResolvedValue(null)

      await deleteDocument(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})
