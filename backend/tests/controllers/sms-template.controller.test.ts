import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getSMSTemplates, getSMSTemplate, createSMSTemplate, deleteSMSTemplate } from '../../src/controllers/sms-template.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('sms-template.controller', () => {
  describe('getSMSTemplates', () => {
    it('returns templates', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.sMSTemplate.findMany.mockResolvedValue([{ id: 't1', name: 'Follow up', body: 'Hi {{name}}' }] as any)
      mockPrisma.sMSTemplate.count.mockResolvedValue(1)

      await getSMSTemplates(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getSMSTemplate', () => {
    it('returns template by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue({ id: 't1', name: 'Test', body: 'Hello', organizationId: 'org-1' } as any)

      await getSMSTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError when missing', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.sMSTemplate.findUnique.mockResolvedValue(null)

      await expect(getSMSTemplate(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createSMSTemplate', () => {
    it('creates sms template', async () => {
      const { req, res } = mockReqRes({}, { name: 'New', body: 'Hi {{name}}' })
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue(null)
      mockPrisma.sMSTemplate.create.mockResolvedValue({ id: 't1', name: 'New', body: 'Hi {{name}}' } as any)

      await createSMSTemplate(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('deleteSMSTemplate', () => {
    it('deletes sms template', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.sMSTemplate.findFirst.mockResolvedValue({ id: 't1' } as any)
      mockPrisma.sMSTemplate.delete.mockResolvedValue({ id: 't1' } as any)

      await deleteSMSTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
