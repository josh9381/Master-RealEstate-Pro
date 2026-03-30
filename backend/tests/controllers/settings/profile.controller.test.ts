import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))
jest.mock('../../../src/config/upload', () => ({
  getUploadUrl: jest.fn((path: string) => `/uploads/${path}`),
  deleteUploadFile: jest.fn().mockResolvedValue(undefined),
}))

import { getProfile, updateProfile, changePassword } from '../../../src/controllers/settings/profile.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/profile.controller', () => {
  describe('getProfile', () => {
    it('returns user profile', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', firstName: 'John', lastName: 'Doe', email: 'a@test.com',
      } as any)

      await getProfile(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateProfile', () => {
    it('updates profile', async () => {
      const { req, res } = mockReqRes({}, { firstName: 'Jane' })
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', firstName: 'Jane' } as any)

      await updateProfile(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('changePassword', () => {
    it('changes password', async () => {
      const { req, res } = mockReqRes({}, { currentPassword: 'old', newPassword: 'NewP@ss123' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hashed_old' } as any)
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' } as any)

      await changePassword(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
