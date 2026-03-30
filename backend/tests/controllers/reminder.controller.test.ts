import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getReminders, getReminder, createReminder, updateReminder, deleteReminder } from '../../src/controllers/reminder.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('reminder.controller', () => {
  describe('getReminders', () => {
    it('returns reminders', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.followUpReminder.findMany.mockResolvedValue([{ id: 'r1', title: 'Follow up' }] as any)
      mockPrisma.followUpReminder.count.mockResolvedValue(1)

      await getReminders(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getReminder', () => {
    it('returns reminder by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'r1' })
      mockPrisma.followUpReminder.findFirst.mockResolvedValue({ id: 'r1', title: 'Test' } as any)

      await getReminder(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('returns 404 when not found', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'r1' })
      mockPrisma.followUpReminder.findFirst.mockResolvedValue(null)

      await getReminder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createReminder', () => {
    it('creates reminder', async () => {
      const { req, res } = mockReqRes({}, {
        leadId: 'lead1', title: 'New Reminder', dueAt: '2026-12-01T00:00:00.000Z',
      })
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead1' } as any)
      mockPrisma.followUpReminder.create.mockResolvedValue({ id: 'r1', title: 'New Reminder' } as any)

      await createReminder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 400 on validation error', async () => {
      const { req, res } = mockReqRes({}, { title: 'Missing fields' })

      await createReminder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when lead not found', async () => {
      const { req, res } = mockReqRes({}, {
        leadId: 'bad', title: 'Test', dueAt: '2026-12-01T00:00:00.000Z',
      })
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      await createReminder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('updateReminder', () => {
    it('updates reminder', async () => {
      const { req, res } = mockReqRes({}, { title: 'Updated' }, { id: 'r1' })
      mockPrisma.followUpReminder.findFirst.mockResolvedValue({ id: 'r1' } as any)
      mockPrisma.followUpReminder.update.mockResolvedValue({ id: 'r1', title: 'Updated' } as any)

      await updateReminder(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteReminder', () => {
    it('deletes reminder', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'r1' })
      mockPrisma.followUpReminder.findFirst.mockResolvedValue({ id: 'r1' } as any)
      mockPrisma.followUpReminder.delete.mockResolvedValue({ id: 'r1' } as any)

      await deleteReminder(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
