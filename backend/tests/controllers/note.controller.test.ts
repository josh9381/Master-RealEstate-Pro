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

import { getNotesForLead, createNote, updateNote, deleteNote } from '../../src/controllers/note.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('note.controller', () => {
  describe('getNotesForLead', () => {
    it('returns notes for a lead', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'lead1' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1' } as any)
      mockPrisma.note.findMany.mockResolvedValue([{ id: 'n1', content: 'Test note' }] as any)

      await getNotesForLead(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing lead', async () => {
      const { req, res } = mockReqRes({}, {}, { leadId: 'missing' })
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      await expect(getNotesForLead(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createNote', () => {
    it('creates note and returns 201', async () => {
      const { req, res } = mockReqRes({}, { content: 'New note' }, { leadId: 'lead1' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1' } as any)
      mockPrisma.note.create.mockResolvedValue({ id: 'n1', content: 'New note' } as any)

      await createNote(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateNote', () => {
    it('updates note content', async () => {
      const { req, res } = mockReqRes({}, { content: 'Updated' }, { id: 'n1' })
      mockPrisma.note.findFirst.mockResolvedValue({ id: 'n1', authorId: 'u1' } as any)
      mockPrisma.note.update.mockResolvedValue({ id: 'n1', content: 'Updated' } as any)

      await updateNote(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws ForbiddenError for non-author', async () => {
      const { req, res } = mockReqRes({}, { content: 'Update' }, { id: 'n1' })
      req.user.role = 'MEMBER'
      mockPrisma.note.findFirst.mockResolvedValue({ id: 'n1', authorId: 'other-user' } as any)

      await expect(updateNote(req, res)).rejects.toThrow(/author|edit|permission/i)
    })
  })

  describe('deleteNote', () => {
    it('deletes note', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'n1' })
      mockPrisma.note.findFirst.mockResolvedValue({ id: 'n1', authorId: 'u1' } as any)
      mockPrisma.note.delete.mockResolvedValue({ id: 'n1' } as any)

      await deleteNote(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
