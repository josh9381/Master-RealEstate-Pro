import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

const mockPrismaInstance = mockDeep<PrismaClientType>()
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}))

import {
  getSavedFilterViews, createSavedFilterView, updateSavedFilterView, deleteSavedFilterView, filterConfigToSegmentRules
} from '../../src/controllers/savedFilter.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { id: 'u1', userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrismaInstance))

describe('savedFilter.controller', () => {
  describe('getSavedFilterViews', () => {
    it('returns saved filter views', async () => {
      const { req, res } = mockReqRes()
      mockPrismaInstance.savedFilterView.findMany.mockResolvedValue([
        { id: 'f1', name: 'Active Leads', userId: 'u1' },
      ] as any)

      await getSavedFilterViews(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createSavedFilterView', () => {
    it('creates a saved filter view', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Filter', filterConfig: { status: ['ACTIVE'] },
      })
      mockPrismaInstance.savedFilterView.updateMany.mockResolvedValue({ count: 0 })
      mockPrismaInstance.savedFilterView.create.mockResolvedValue({
        id: 'f1', name: 'New Filter',
      } as any)

      await createSavedFilterView(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateSavedFilterView', () => {
    it('updates a saved filter view', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated Filter' }, { id: 'f1' })
      mockPrismaInstance.savedFilterView.findFirst.mockResolvedValue({ id: 'f1', userId: 'u1' } as any)
      mockPrismaInstance.savedFilterView.updateMany.mockResolvedValue({ count: 0 })
      mockPrismaInstance.savedFilterView.update.mockResolvedValue({ id: 'f1', name: 'Updated Filter' } as any)

      await updateSavedFilterView(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 'bad' })
      mockPrismaInstance.savedFilterView.findFirst.mockResolvedValue(null)

      await updateSavedFilterView(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('deleteSavedFilterView', () => {
    it('deletes a saved filter view', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'f1' })
      mockPrismaInstance.savedFilterView.findFirst.mockResolvedValue({ id: 'f1', userId: 'u1' } as any)
      mockPrismaInstance.savedFilterView.delete.mockResolvedValue({ id: 'f1' } as any)

      await deleteSavedFilterView(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrismaInstance.savedFilterView.findFirst.mockResolvedValue(null)

      await deleteSavedFilterView(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('filterConfigToSegmentRules', () => {
    it('converts status filter', () => {
      const rules = filterConfigToSegmentRules({ status: ['ACTIVE', 'NEW'] })
      expect(rules).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'status', operator: 'in' }),
      ]))
    })

    it('returns empty array for empty config', () => {
      const rules = filterConfigToSegmentRules({})
      expect(rules).toEqual([])
    })
  })
})
