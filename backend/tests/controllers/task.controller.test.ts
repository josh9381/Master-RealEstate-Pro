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
jest.mock('../../src/config/socket', () => ({
  pushTaskUpdate: jest.fn(),
}))

import { getTasks, getTask, createTask, updateTask, deleteTask, completeTask, getTaskStats } from '../../src/controllers/task.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('task.controller', () => {
  describe('getTasks', () => {
    it('returns paginated tasks', async () => {
      const { req, res } = mockReqRes({ page: '1', limit: '20' })
      mockPrisma.task.findMany.mockResolvedValue([{ id: 't1', title: 'Follow up' }] as any)
      mockPrisma.task.count.mockResolvedValue(1)

      await getTasks(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('applies status and priority filters', async () => {
      const { req, res } = mockReqRes({ status: 'PENDING', priority: 'HIGH' })
      mockPrisma.task.findMany.mockResolvedValue([])
      mockPrisma.task.count.mockResolvedValue(0)

      await getTasks(req, res)

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING', priority: 'HIGH' }),
        })
      )
    })
  })

  describe('getTask', () => {
    it('returns task by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', title: 'Task', dueDate: new Date() } as any)

      await getTask(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing task', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.task.findFirst.mockResolvedValue(null)

      await expect(getTask(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createTask', () => {
    it('creates task and returns 201', async () => {
      const { req, res } = mockReqRes({}, { title: 'New task', dueDate: '2026-12-01', assignedToId: 'u1' })
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' } as any)
      mockPrisma.task.create.mockResolvedValue({ id: 't1', title: 'New task' } as any)

      await createTask(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateTask', () => {
    it('updates task', async () => {
      const { req, res } = mockReqRes({}, { title: 'Updated' }, { id: 't1' })
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1' } as any)
      mockPrisma.task.update.mockResolvedValue({ id: 't1', title: 'Updated' } as any)

      await updateTask(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('completeTask', () => {
    it('marks task as completed', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', status: 'PENDING' } as any)
      mockPrisma.task.update.mockResolvedValue({ id: 't1', status: 'COMPLETED' } as any)

      await completeTask(req, res)

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      )
    })
  })

  describe('deleteTask', () => {
    it('deletes task', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 't1' })
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1' } as any)
      mockPrisma.task.delete.mockResolvedValue({ id: 't1' } as any)

      await deleteTask(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getTaskStats', () => {
    it('returns task statistics', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.task.groupBy.mockResolvedValue([{ status: 'PENDING', _count: { _all: 5 } }] as any)
      mockPrisma.task.count.mockResolvedValue(3)

      await getTaskStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
