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

import { getUsers, getUser, updateUserRole, deleteUser } from '../../src/controllers/user.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('user.controller', () => {
  describe('getUsers', () => {
    it('returns org users', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@test.com' }] as any)

      await getUsers(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getUser', () => {
    it('returns user by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'u2' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', organizationId: 'org-1' } as any)

      await getUser(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing user', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(getUser(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('updateUserRole', () => {
    it('updates user role', async () => {
      const { req, res } = mockReqRes({}, { role: 'MANAGER' }, { id: 'u2' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', organizationId: 'org-1' } as any)
      mockPrisma.user.update.mockResolvedValue({ id: 'u2', role: 'MANAGER' } as any)

      await updateUserRole(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('prevents self-demotion', async () => {
      const { req, res } = mockReqRes({}, { role: 'USER' }, { id: 'u1' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', organizationId: 'org-1', role: 'ADMIN' } as any)

      await expect(updateUserRole(req, res)).rejects.toThrow(/cannot|own|self|privilege/i)
    })
  })

  describe('deleteUser', () => {
    it('deletes user', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'u2' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', organizationId: 'org-1' } as any)
      mockPrisma.user.delete.mockResolvedValue({ id: 'u2' } as any)

      await deleteUser(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('prevents self-deletion', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'u1' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', organizationId: 'org-1' } as any)

      await expect(deleteUser(req, res)).rejects.toThrow(/cannot|own|self|delete/i)
    })
  })
})
