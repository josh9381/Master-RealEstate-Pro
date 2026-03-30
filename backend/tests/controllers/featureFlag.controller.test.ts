import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag } from '../../src/controllers/featureFlag.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('featureFlag.controller', () => {
  describe('getFeatureFlags', () => {
    it('returns feature flags', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.featureFlag.findMany.mockResolvedValue([
        { id: 'f1', name: 'Dark Mode', key: 'dark_mode', enabled: true },
      ] as any)

      await getFeatureFlags(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('seeds defaults when none exist', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.featureFlag.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'f1', name: 'Default', key: 'default' }] as any)
      mockPrisma.featureFlag.createMany.mockResolvedValue({ count: 1 })

      await getFeatureFlags(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createFeatureFlag', () => {
    it('creates feature flag', async () => {
      const { req, res } = mockReqRes({}, { name: 'New Feature', key: 'new_feature', enabled: false })
      mockPrisma.featureFlag.create.mockResolvedValue({ id: 'f1', name: 'New Feature', key: 'new_feature' } as any)

      await createFeatureFlag(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateFeatureFlag', () => {
    it('updates feature flag', async () => {
      const { req, res } = mockReqRes({}, { enabled: true }, { id: 'f1' })
      mockPrisma.featureFlag.findFirst.mockResolvedValue({ id: 'f1' } as any)
      mockPrisma.featureFlag.update.mockResolvedValue({ id: 'f1', enabled: true } as any)

      await updateFeatureFlag(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteFeatureFlag', () => {
    it('deletes feature flag', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'f1' })
      mockPrisma.featureFlag.findFirst.mockResolvedValue({ id: 'f1' } as any)
      mockPrisma.featureFlag.delete.mockResolvedValue({ id: 'f1' } as any)

      await deleteFeatureFlag(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
