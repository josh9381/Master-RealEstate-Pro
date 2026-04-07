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
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), pino: { child: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })) } },
}))

jest.mock('../../src/services/integrationSync.service', () => ({
  runSync: jest.fn(),
}))

import { listIntegrations, disconnectIntegration, getIntegrationStatus, syncIntegration } from '../../src/controllers/integration.controller'
import { runSync } from '../../src/services/integrationSync.service'

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

  describe('syncIntegration', () => {
    it('runs sync and returns results', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'google' })
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'i1', provider: 'google', isConnected: true, syncStatus: 'IDLE',
        userId: 'u1', organizationId: 'org-1', credentials: null, config: null,
      } as any)
      ;(runSync as jest.Mock).mockResolvedValue({
        recordsSynced: 10, recordsCreated: 2, recordsUpdated: 3,
        recordsSkipped: 5, errors: [], duration: 123,
      })

      await syncIntegration(req, res)

      expect(runSync).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ recordsSynced: 10 }),
      }))
    })

    it('returns 409 when sync is already in progress', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'google' })
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'i1', provider: 'google', isConnected: true, syncStatus: 'SYNCING',
      } as any)

      await syncIntegration(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(runSync).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when integration is not connected', async () => {
      const { req, res } = mockReqRes({}, {}, { provider: 'google' })
      mockPrisma.integration.findUnique.mockResolvedValue(null)

      await expect(syncIntegration(req, res)).rejects.toThrow()
    })
  })
})
