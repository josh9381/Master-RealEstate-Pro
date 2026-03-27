import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockLogger = { info: jest.fn(), error: jest.fn() }
jest.mock('../../src/lib/logger', () => ({ logger: mockLogger }))

import { logAPIKeyAccess, getAPIKeyAuditLogs, getProviderAuditLogs } from '../../src/utils/apiKeyAudit'

describe('apiKeyAudit utils', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    mockLogger.info.mockClear()
    mockLogger.error.mockClear()
  })

  describe('logAPIKeyAccess', () => {
    it('creates an audit log entry with all fields', async () => {
      const req = {
        ip: '1.2.3.4',
        headers: { 'user-agent': 'TestAgent/1.0' },
        socket: { remoteAddress: '5.6.7.8' },
      } as any
      ;(mockPrisma.aPIKeyAudit.create as jest.Mock).mockResolvedValue({})

      await logAPIKeyAccess('user1', 'twilio', 'created', req, 'org1')

      expect(mockPrisma.aPIKeyAudit.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          organizationId: 'org1',
          provider: 'twilio',
          action: 'created',
          ipAddress: '1.2.3.4',
          userAgent: 'TestAgent/1.0',
        },
      })
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('falls back to x-forwarded-for when req.ip is undefined', async () => {
      const req = {
        ip: undefined,
        headers: { 'x-forwarded-for': '9.9.9.9', 'user-agent': 'UA' },
        socket: {},
      } as any
      ;(mockPrisma.aPIKeyAudit.create as jest.Mock).mockResolvedValue({})

      await logAPIKeyAccess('u2', 'sendgrid', 'updated', req)

      const callData = (mockPrisma.aPIKeyAudit.create as jest.Mock).mock.calls[0][0].data
      expect(callData.ipAddress).toBe('9.9.9.9')
    })

    it('uses "unknown" as organizationId when not provided', async () => {
      ;(mockPrisma.aPIKeyAudit.create as jest.Mock).mockResolvedValue({})

      await logAPIKeyAccess('u3', 'openai', 'accessed')

      const callData = (mockPrisma.aPIKeyAudit.create as jest.Mock).mock.calls[0][0].data
      expect(callData.organizationId).toBe('unknown')
    })

    it('does not throw when prisma.create fails', async () => {
      ;(mockPrisma.aPIKeyAudit.create as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(logAPIKeyAccess('u4', 'stripe', 'deleted')).resolves.toBeUndefined()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('handles missing req gracefully (null ipAddress and userAgent)', async () => {
      ;(mockPrisma.aPIKeyAudit.create as jest.Mock).mockResolvedValue({})

      await logAPIKeyAccess('u5', 'twilio', 'created', undefined, 'org2')

      const callData = (mockPrisma.aPIKeyAudit.create as jest.Mock).mock.calls[0][0].data
      expect(callData.ipAddress).toBeNull()
      expect(callData.userAgent).toBeNull()
    })
  })

  describe('getAPIKeyAuditLogs', () => {
    it('returns logs for a user with default limit 50', async () => {
      const fakeLogs = [{ id: '1', userId: 'u1', provider: 'twilio', action: 'created' }]
      ;(mockPrisma.aPIKeyAudit.findMany as jest.Mock).mockResolvedValue(fakeLogs)

      const result = await getAPIKeyAuditLogs('u1')

      expect(mockPrisma.aPIKeyAudit.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      expect(result).toEqual(fakeLogs)
    })

    it('respects custom limit', async () => {
      ;(mockPrisma.aPIKeyAudit.findMany as jest.Mock).mockResolvedValue([])

      await getAPIKeyAuditLogs('u2', 10)

      expect(mockPrisma.aPIKeyAudit.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }))
    })
  })

  describe('getProviderAuditLogs', () => {
    it('filters by userId and provider with default limit', async () => {
      const fakeLogs = [{ id: '2', provider: 'sendgrid' }]
      ;(mockPrisma.aPIKeyAudit.findMany as jest.Mock).mockResolvedValue(fakeLogs)

      const result = await getProviderAuditLogs('u1', 'sendgrid')

      expect(mockPrisma.aPIKeyAudit.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', provider: 'sendgrid' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      expect(result).toEqual(fakeLogs)
    })

    it('respects custom limit', async () => {
      ;(mockPrisma.aPIKeyAudit.findMany as jest.Mock).mockResolvedValue([])

      await getProviderAuditLogs('u3', 'twilio', 5)

      expect(mockPrisma.aPIKeyAudit.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
    })
  })
})
