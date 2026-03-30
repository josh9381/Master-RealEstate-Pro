import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../../src/config/upload', () => ({
  getUploadUrl: jest.fn((path: string) => `/uploads/${path}`),
  deleteUploadFile: jest.fn().mockResolvedValue(undefined),
}))

import { getBusinessSettings, updateBusinessSettings } from '../../../src/controllers/settings/business.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/business.controller', () => {
  describe('getBusinessSettings', () => {
    it('returns business settings', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Test Org' } as any)

      await getBusinessSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateBusinessSettings', () => {
    it('updates business settings', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated Org', phone: '+15551234567' })
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1', name: 'Updated Org' } as any)

      await updateBusinessSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
