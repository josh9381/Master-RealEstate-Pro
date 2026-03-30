import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getNotificationSettings, updateNotificationSettings } from '../../../src/controllers/settings/notification.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('settings/notification.controller', () => {
  describe('getNotificationSettings', () => {
    it('returns notification settings', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.notificationSettings.findFirst.mockResolvedValue({ id: 'ns1', emailEnabled: true } as any)

      await getNotificationSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateNotificationSettings', () => {
    it('updates notification settings', async () => {
      const { req, res } = mockReqRes({}, { emailEnabled: false, pushEnabled: true })
      mockPrisma.notificationSettings.upsert.mockResolvedValue({ id: 'ns1' } as any)

      await updateNotificationSettings(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
