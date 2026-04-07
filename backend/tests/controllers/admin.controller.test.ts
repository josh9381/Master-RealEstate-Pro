import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => null),
  isRedisConnected: jest.fn(() => false),
}))
jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

import { getSystemSettings, updateSystemSettings, healthCheck, getTeamMembers, getAdminStats } from '../../src/controllers/admin.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('admin.controller', () => {
  describe('getSystemSettings', () => {
    it('returns system settings', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'ss1', organizationId: 'org-1', settings: {},
      } as any)

      await getSystemSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateSystemSettings', () => {
    it('updates system settings', async () => {
      const { req, res } = mockReqRes({}, { section: 'general', data: { companyName: 'Test' } })
      mockPrisma.systemSettings.findUnique.mockResolvedValue({ id: 'ss1', settings: {} } as any)
      mockPrisma.systemSettings.upsert.mockResolvedValue({ id: 'ss1' } as any)

      await updateSystemSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('healthCheck', () => {
    it('returns health status', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])

      await healthCheck(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getTeamMembers', () => {
    it('returns team members', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'ADMIN' },
      ] as any)
      mockPrisma.user.count.mockResolvedValue(1)

      await getTeamMembers(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getAdminStats', () => {
    it('returns real stats with system health', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', name: 'Test Org', subscriptionTier: 'PRO', isActive: true, createdAt: new Date(),
      } as any)
      mockPrisma.user.count.mockResolvedValue(5)
      mockPrisma.lead.count.mockResolvedValue(100)
      mockPrisma.campaign.count.mockResolvedValue(10)
      mockPrisma.workflow.count.mockResolvedValue(3)
      mockPrisma.message.count.mockResolvedValue(500)
      mockPrisma.appointment.count.mockResolvedValue(20)
      mockPrisma.dataBackup.findFirst.mockResolvedValue({
        createdAt: new Date('2026-04-01'),
      } as any)
      mockPrisma.auditLog.count.mockResolvedValue(42)
      mockPrisma.$queryRaw.mockResolvedValue([{ size: BigInt(1024 * 1024 * 50) }])

      await getAdminStats(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            systemHealth: expect.objectContaining({
              database: expect.stringMatching(/healthy|degraded|down/),
              apiResponseTime: expect.any(Number),
              uptime: expect.stringContaining('h'),
              errorRate: expect.stringContaining('%'),
            }),
            stats: expect.objectContaining({
              totalUsers: expect.any(Number),
              totalLeads: expect.any(Number),
              apiCalls: expect.any(Number),
              lastBackup: expect.any(String),
            }),
          }),
        })
      )
    })

    it('returns null lastBackup when no backups exist', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1', name: 'Test Org', subscriptionTier: 'FREE', isActive: true, createdAt: new Date(),
      } as any)
      mockPrisma.user.count.mockResolvedValue(1)
      mockPrisma.lead.count.mockResolvedValue(0)
      mockPrisma.campaign.count.mockResolvedValue(0)
      mockPrisma.workflow.count.mockResolvedValue(0)
      mockPrisma.message.count.mockResolvedValue(0)
      mockPrisma.appointment.count.mockResolvedValue(0)
      mockPrisma.dataBackup.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.count.mockResolvedValue(0)
      mockPrisma.$queryRaw.mockResolvedValue([{ size: BigInt(1024 * 1024) }])

      await getAdminStats(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            stats: expect.objectContaining({
              lastBackup: null,
              apiCalls: 0,
            }),
          }),
        })
      )
    })
  })
})
