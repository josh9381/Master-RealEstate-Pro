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
}))
jest.mock('../../../src/utils/2fa', () => ({
  generate2FASecret: jest.fn(() => ({ secret: 'TESTSECRET', otpauthUrl: 'otpauth://test' })),
  generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,test'),
  verify2FAToken: jest.fn(() => true),
}))

import { getSecuritySettings, enable2FA } from '../../../src/controllers/settings/security.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/security.controller', () => {
  describe('getSecuritySettings', () => {
    it('returns security settings', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', twoFactorEnabled: false, twoFactorSecret: null,
      } as any)

      await getSecuritySettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('enable2FA', () => {
    it('generates 2FA setup', async () => {
      const { req, res } = mockReqRes({}, { password: 'password123' })
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', password: 'hashed', twoFactorEnabled: false,
      } as any)
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' } as any)

      await enable2FA(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
