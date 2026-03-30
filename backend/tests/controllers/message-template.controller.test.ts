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

import { getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate } from '../../src/controllers/message-template.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('message-template.controller', () => {
  describe('getMessageTemplates', () => {
    it('returns templates', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.messageTemplate.findMany.mockResolvedValue([{ id: 'mt1', name: 'Quick Reply' }] as any)

      await getMessageTemplates(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createMessageTemplate', () => {
    it('creates template', async () => {
      const { req, res } = mockReqRes({}, { name: 'New', content: 'Template content', category: 'general' })
      mockPrisma.messageTemplate.create.mockResolvedValue({ id: 'mt1' } as any)

      await createMessageTemplate(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateMessageTemplate', () => {
    it('updates template', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 'mt1' })
      mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 'mt1' } as any)
      mockPrisma.messageTemplate.update.mockResolvedValue({ id: 'mt1', name: 'Updated' } as any)

      await updateMessageTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteMessageTemplate', () => {
    it('deletes template', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'mt1' })
      mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 'mt1' } as any)
      mockPrisma.messageTemplate.delete.mockResolvedValue({ id: 'mt1' } as any)

      await deleteMessageTemplate(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
