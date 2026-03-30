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
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}))

import { listTeams, createTeam, getTeam, updateTeam, deleteTeam, inviteMember, removeMember } from '../../src/controllers/team.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('team.controller', () => {
  describe('listTeams', () => {
    it('returns user teams', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.teamMember.findMany.mockResolvedValue([
        { team: { id: 'team1', name: 'Sales' } },
      ] as any)

      await listTeams(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createTeam', () => {
    it('creates team with creator as OWNER', async () => {
      const { req, res } = mockReqRes({}, { name: 'New Team' })
      mockPrisma.team.create.mockResolvedValue({ id: 'team1', name: 'New Team' } as any)

      await createTeam(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamMembers: expect.objectContaining({
              create: expect.objectContaining({ role: 'OWNER' }),
            }),
          }),
        })
      )
    })
  })

  describe('getTeam', () => {
    it('returns team details', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'team1' })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team1',
        organizationId: 'org-1',
        teamMembers: [{ userId: 'u1', role: 'OWNER' }],
      } as any)

      await getTeam(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing team', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.team.findUnique.mockResolvedValue(null)

      await expect(getTeam(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('inviteMember', () => {
    it('invites a new member', async () => {
      const { req, res } = mockReqRes({}, { email: 'new@test.com', role: 'MEMBER' }, { id: 'team1' })
      mockPrisma.teamMember.findFirst
        .mockResolvedValueOnce({ userId: 'u1', role: 'OWNER' } as any) // permission check
        .mockResolvedValueOnce(null) // no existing membership
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', email: 'new@test.com' } as any)
      mockPrisma.teamMember.create.mockResolvedValue({ userId: 'u2', role: 'MEMBER', user: { id: 'u2', firstName: 'New', lastName: 'User', email: 'new@test.com' } } as any)

      await inviteMember(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws ConflictError for existing member', async () => {
      const { req, res } = mockReqRes({}, { email: 'exist@test.com' }, { id: 'team1' })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team1',
        organizationId: 'org-1',
        teamMembers: [{ userId: 'u1', role: 'OWNER' }],
      } as any)
      mockPrisma.teamMember.findFirst
        .mockResolvedValueOnce({ userId: 'u1', role: 'OWNER' } as any)
        .mockResolvedValueOnce({ userId: 'u2', role: 'MEMBER' } as any) // already member
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2' } as any)

      await expect(inviteMember(req, res)).rejects.toThrow(/already/i)
    })
  })

  describe('deleteTeam', () => {
    it('deletes team by OWNER', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'team1' })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team1',
        organizationId: 'org-1',
        teamMembers: [{ userId: 'u1', role: 'OWNER' }],
      } as any)
      mockPrisma.teamMember.findFirst.mockResolvedValue({ role: 'OWNER' } as any)
      mockPrisma.team.delete.mockResolvedValue({ id: 'team1' } as any)

      await deleteTeam(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
