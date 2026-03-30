import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../../src/utils/encryption', () => ({
  encryptForUser: jest.fn((v: string) => `enc_${v}`),
  decryptForUser: jest.fn((v: string) => v.replace('enc_', '')),
}))
jest.mock('../../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'msg1' }),
}))

import { getEmailConfig } from '../../../src/controllers/settings/email.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/email.controller', () => {
  describe('getEmailConfig', () => {
    it('returns email config', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.emailConfig.findUnique.mockResolvedValue({
        id: 'ec1', userId: 'u1', provider: 'sendgrid', isActive: true,
        apiKey: 'enc_SG.key', fromEmail: 'test@example.com', fromName: 'Test',
      } as any)

      await getEmailConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('creates default config when none exists', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.emailConfig.findUnique.mockResolvedValue(null)
      mockPrisma.emailConfig.create.mockResolvedValue({
        id: 'ec1', userId: 'u1', provider: null, isActive: false,
      } as any)

      await getEmailConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
