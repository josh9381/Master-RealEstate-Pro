import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'msg1' }),
}))
jest.mock('../../src/services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ sid: 'SM123' }),
}))
jest.mock('../../src/services/template.service', () => ({
  templateService: {
    renderTemplate: jest.fn().mockReturnValue('rendered content'),
  },
}))
jest.mock('../../src/utils/roleFilters', () => ({
  getMessagesFilter: jest.fn().mockReturnValue({}),
  getRoleFilterFromRequest: jest.fn().mockReturnValue({}),
}))

import { getMessages, getMessage, deleteMessage } from '../../src/controllers/message.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('message.controller', () => {
  describe('getMessages', () => {
    it('returns messages', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'm1', subject: 'Hello', body: 'Test', type: 'EMAIL',
          direction: 'INBOUND', status: 'DELIVERED', fromAddress: 'a@test.com',
          toAddress: 'b@test.com', leadId: 'lead1', threadId: null,
          readAt: null, starred: false, archived: false, trashedAt: null,
          snoozedUntil: null, metadata: null, createdAt: new Date(),
          lead: { id: 'lead1', firstName: 'John', lastName: 'Doe', email: 'b@test.com', phone: null },
        },
      ] as any)
      mockPrisma.message.count.mockResolvedValue(1)

      await getMessages(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getMessage', () => {
    it('returns message by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'm1' })
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 'm1', subject: 'Hello', body: 'Test', type: 'EMAIL',
      } as any)

      await getMessage(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError when missing', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.message.findFirst.mockResolvedValue(null)

      await expect(getMessage(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('deleteMessage', () => {
    it('soft-deletes message (trash)', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'm1' })
      mockPrisma.message.findFirst.mockResolvedValue({ id: 'm1', trashedAt: null } as any)
      mockPrisma.message.update.mockResolvedValue({ id: 'm1', trashedAt: new Date() } as any)

      await deleteMessage(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
