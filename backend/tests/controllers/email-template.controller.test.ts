import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getEmailTemplates, getEmailTemplate, createEmailTemplate, deleteEmailTemplate } from '../../src/controllers/email-template.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('email-template.controller', () => {
  describe('getEmailTemplates', () => {
    it('returns templates with pagination', async () => {
      const { req, res } = mockReqRes({ page: '1', limit: '10' })
      mockPrisma.emailTemplate.findMany.mockResolvedValue([{ id: 't1', name: 'Welcome' }] as any)
      mockPrisma.emailTemplate.count.mockResolvedValue(1)

      await getEmailTemplates(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getEmailTemplate', () => {
    it('returns template by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: 't1', name: 'Welcome', organizationId: 'org-1' } as any)

      await getEmailTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError when missing', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null)

      await expect(getEmailTemplate(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createEmailTemplate', () => {
    it('creates email template', async () => {
      const { req, res } = mockReqRes({}, { name: 'New Template', subject: 'Hello', body: '<p>Hi</p>' })
      mockPrisma.emailTemplate.findFirst.mockResolvedValue(null)
      mockPrisma.emailTemplate.create.mockResolvedValue({ id: 't1', name: 'New Template' } as any)

      await createEmailTemplate(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('deleteEmailTemplate', () => {
    it('deletes email template', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.emailTemplate.findFirst.mockResolvedValue({ id: 't1' } as any)
      mockPrisma.emailTemplate.delete.mockResolvedValue({ id: 't1' } as any)

      await deleteEmailTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
