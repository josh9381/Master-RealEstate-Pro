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

import { getTags, createTag, updateTag, deleteTag, addTagsToLead } from '../../src/controllers/tag.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('tag.controller', () => {
  describe('getTags', () => {
    it('returns tags with counts', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.tag.findMany.mockResolvedValue([{ id: 't1', name: 'VIP', _count: { leads: 5 } }] as any)

      await getTags(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createTag', () => {
    it('creates tag and returns 201', async () => {
      const { req, res } = mockReqRes({}, { name: 'Hot Lead', color: '#FF0000' })
      mockPrisma.tag.findFirst.mockResolvedValue(null)
      mockPrisma.tag.create.mockResolvedValue({ id: 't1', name: 'Hot Lead' } as any)

      await createTag(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws ConflictError for duplicate name', async () => {
      const { req, res } = mockReqRes({}, { name: 'VIP' })
      mockPrisma.tag.findFirst.mockResolvedValue({ id: 't1', name: 'VIP' } as any)

      await expect(createTag(req, res)).rejects.toThrow(/already exists/i)
    })
  })

  describe('updateTag', () => {
    it('updates tag', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 't1' })
      mockPrisma.tag.findFirst
        .mockResolvedValueOnce({ id: 't1', name: 'OldName' } as any)
        .mockResolvedValueOnce(null) // no duplicate
      mockPrisma.tag.update.mockResolvedValue({ id: 't1', name: 'Updated' } as any)

      await updateTag(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing tag', async () => {
      const { req, res } = mockReqRes({}, { name: 'X' }, { id: 'missing' })
      mockPrisma.tag.findFirst.mockResolvedValue(null)

      await expect(updateTag(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('deleteTag', () => {
    it('deletes tag with counts', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.tag.findFirst.mockResolvedValue({ id: 't1', _count: { leads: 2, campaigns: 1 } } as any)
      mockPrisma.tag.delete.mockResolvedValue({ id: 't1' } as any)

      await deleteTag(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('addTagsToLead', () => {
    it('adds tags to lead', async () => {
      const { req, res } = mockReqRes({}, { tagIds: ['t1', 't2'] }, { leadId: 'lead1' })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1', tags: [] } as any)
      mockPrisma.tag.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }] as any)
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead1', tags: [{ id: 't1' }, { id: 't2' }] } as any)

      await addTagsToLead(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing lead', async () => {
      const { req, res } = mockReqRes({}, { tagIds: ['t1'] }, { leadId: 'missing' })
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      await expect(addTagsToLead(req, res)).rejects.toThrow(/not found/i)
    })
  })
})
