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

import { getSystemSettings, updateSystemSettings, healthCheck, getTeamMembers } from '../../src/controllers/admin.controller'

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
})
