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
  maskSensitive: jest.fn((v: string) => '****' + v.slice(-4)),
}))
jest.mock('../../../src/utils/apiKeyAudit', () => ({
  logAPIKeyAccess: jest.fn(),
}))
jest.mock('../../../src/services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ sid: 'SM123' }),
}))

import { getSMSConfig, deleteSMSConfig } from '../../../src/controllers/settings/sms.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/sms.controller', () => {
  describe('getSMSConfig', () => {
    it('returns SMS config', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.sMSConfig.findUnique.mockResolvedValue({
        id: 'sc1', userId: 'u1', provider: 'twilio', isActive: true,
        accountSid: 'enc_AC123', authToken: 'enc_token', phoneNumber: '+15551234567',
      } as any)

      await getSMSConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('creates default config when none exists', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.sMSConfig.findUnique.mockResolvedValue(null)
      mockPrisma.sMSConfig.create.mockResolvedValue({
        id: 'sc1', userId: 'u1', provider: null, isActive: false,
      } as any)

      await getSMSConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteSMSConfig', () => {
    it('clears SMS config credentials', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.sMSConfig.update.mockResolvedValue({
        id: 'sc1', provider: null, accountSid: null, authToken: null,
      } as any)

      await deleteSMSConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
