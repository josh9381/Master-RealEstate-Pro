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
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { runSync } from '../../src/services/integrationSync.service'

beforeEach(() => mockReset(mockPrisma))

function makeIntegration(overrides = {}) {
  return {
    id: 'int-1',
    userId: 'u1',
    organizationId: 'org-1',
    provider: 'google',
    isConnected: true,
    credentials: null,
    config: null,
    lastSyncAt: null,
    syncStatus: 'IDLE' as const,
    ...overrides,
  }
}

describe('integrationSync.service', () => {
  describe('runSync', () => {
    it('syncs google integration and marks as SYNCED', async () => {
      const integration = makeIntegration({
        config: { contacts: { syncContacts: true } },
      })
      mockPrisma.integration.update.mockResolvedValue({} as any)
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'l1', email: 'a@test.com', phone: null, updatedAt: new Date() },
      ] as any)

      const result = await runSync(integration as any)

      expect(result.recordsSynced).toBe(1)
      expect(result.errors).toHaveLength(0)
      // Should have been called twice: once for SYNCING, once for SYNCED
      expect(mockPrisma.integration.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncStatus: 'SYNCING' }),
        })
      )
      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncStatus: 'SYNCED' }),
        })
      )
    })

    it('syncs google with contacts disabled', async () => {
      const integration = makeIntegration({
        config: { contacts: { syncContacts: false } },
      })
      mockPrisma.integration.update.mockResolvedValue({} as any)

      const result = await runSync(integration as any)

      expect(result.recordsSynced).toBe(0)
    })

    it('syncs sendgrid integration', async () => {
      const integration = makeIntegration({ provider: 'sendgrid' })
      mockPrisma.integration.update.mockResolvedValue({} as any)
      mockPrisma.emailSuppression.findMany.mockResolvedValue([
        { id: 's1' },
      ] as any)

      const result = await runSync(integration as any)

      expect(result.recordsSynced).toBe(1)
    })

    it('syncs twilio integration', async () => {
      const integration = makeIntegration({ provider: 'twilio' })
      mockPrisma.integration.update.mockResolvedValue({} as any)
      mockPrisma.message.count.mockResolvedValue(42)

      const result = await runSync(integration as any)

      expect(result.recordsSynced).toBe(42)
    })

    it('uses generic handler for unknown providers', async () => {
      const integration = makeIntegration({ provider: 'unknown_provider' })
      mockPrisma.integration.update.mockResolvedValue({} as any)

      const result = await runSync(integration as any)

      expect(result.recordsSynced).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('marks as FAILED when handler throws', async () => {
      const integration = makeIntegration({ provider: 'sendgrid' })
      mockPrisma.integration.update.mockResolvedValue({} as any)
      mockPrisma.emailSuppression.findMany.mockRejectedValue(new Error('DB fail'))

      await expect(runSync(integration as any)).rejects.toThrow('DB fail')

      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: 'FAILED',
            syncError: 'DB fail',
          }),
        })
      )
    })
  })
})
