import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((v: string) => `enc_${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc_', '')),
}))
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { listIntegrations, disconnectIntegration, getIntegrationStatus } from '../../src/controllers/integration.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('integration.controller', () => {
  describe('listIntegrations', () => {
    it('returns integrations', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.integration.findMany.mockResolvedValue([
        { id: 'i1', provider: 'sendgrid', isActive: true, credentials: '{}' },
      ] as any)

      await listIntegrations(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('disconnectIntegration', () => {
    it('disconnects integration', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'sendgrid' })
      mockPrisma.integration.updateMany.mockResolvedValue({ count: 1 })

      await disconnectIntegration(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getIntegrationStatus', () => {
    it('returns integration status', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'sendgrid' })
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'i1', provider: 'sendgrid', isActive: true,
      } as any)

      await getIntegrationStatus(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns not-connected status when not found', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'sendgrid' })
      mockPrisma.integration.findUnique.mockResolvedValue(null)

      await getIntegrationStatus(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
