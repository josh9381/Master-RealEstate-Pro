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
jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../src/services/reminder.service', () => ({
  sendAppointmentReminder: jest.fn().mockResolvedValue(undefined),
}))

import { listAppointments, createAppointment, getAppointment, cancelAppointment, getUpcomingAppointments } from '../../src/controllers/appointment.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('appointment.controller', () => {
  describe('listAppointments', () => {
    it('returns paginated appointments', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.appointment.findMany.mockResolvedValue([{ id: 'a1', title: 'Meeting' }] as any)
      mockPrisma.appointment.count.mockResolvedValue(1)

      await listAppointments(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createAppointment', () => {
    it('creates appointment and returns 201', async () => {
      const { req, res } = mockReqRes({}, {
        title: 'Meeting',
        type: 'MEETING',
        startTime: '2026-12-01T10:00:00Z',
        endTime: '2026-12-01T11:00:00Z',
      })
      mockPrisma.appointment.create.mockResolvedValue({ id: 'a1', title: 'Meeting' } as any)

      await createAppointment(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('getAppointment', () => {
    it('returns appointment by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'a1' })
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'a1', userId: 'u1', organizationId: 'org-1',
      } as any)

      await getAppointment(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing appointment', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.appointment.findFirst.mockResolvedValue(null)

      await expect(getAppointment(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('cancelAppointment', () => {
    it('cancels appointment', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'a1' })
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' } as any)
      mockPrisma.appointment.update.mockResolvedValue({ id: 'a1', status: 'CANCELLED' } as any)

      await cancelAppointment(req, res)

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      )
    })
  })

  describe('getUpcomingAppointments', () => {
    it('returns upcoming appointments', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.appointment.findMany.mockResolvedValue([{ id: 'a1' }] as any)

      await getUpcomingAppointments(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
