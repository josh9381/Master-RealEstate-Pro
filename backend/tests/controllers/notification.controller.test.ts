import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
jest.mock('../../src/config/socket', () => ({
  pushNotification: jest.fn(),
}))

import { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification, getUnreadCount } from '../../src/controllers/notification.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('notification.controller', () => {
  describe('getNotifications', () => {
    it('returns paginated notifications', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1', title: 'New lead' }] as any)
      mockPrisma.notification.count.mockResolvedValue(1)

      await getNotifications(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'n1' })
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', read: true } as any)

      await markAsRead(req, res)

      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ read: true }),
        })
      )
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 } as any)

      await markAllAsRead(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteNotification', () => {
    it('deletes notification', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'n1' })
      mockPrisma.notification.delete.mockResolvedValue({ id: 'n1' } as any)

      await deleteNotification(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createNotification', () => {
    it('creates notification and returns 201', async () => {
      const { req, res } = mockReqRes({}, { title: 'Alert', message: 'New lead assigned' })
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1', userId: 'u1', type: 'SYSTEM', title: 'Alert',
        message: 'New lead assigned', createdAt: new Date('2025-01-01'),
      } as any)

      await createNotification(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.notification.count.mockResolvedValue(7)

      await getUnreadCount(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
