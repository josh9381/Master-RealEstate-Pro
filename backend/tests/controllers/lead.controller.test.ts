import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

// Mock modules before imports
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

jest.mock('../../src/services/workflow-trigger.service', () => ({
  workflowTriggerService: { triggerEvent: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../../src/services/leadScoring.service', () => ({
  updateLeadScore: jest.fn().mockResolvedValue(undefined),
  updateMultipleLeadScores: jest.fn().mockResolvedValue(undefined),
  updateAllLeadScores: jest.fn().mockResolvedValue(undefined),
  getScoreCategory: jest.fn(),
  getLeadsByScoreCategory: jest.fn(),
}))

jest.mock('../../src/utils/roleFilters', () => ({
  getLeadsFilter: jest.fn((_roleFilter, additionalWhere) => ({
    organizationId: 'org-1',
    ...additionalWhere,
  })),
  getRoleFilterFromRequest: jest.fn(() => ({ organizationId: 'org-1', role: 'ADMIN' })),
}))

jest.mock('../../src/config/socket', () => ({
  pushLeadUpdate: jest.fn(),
}))

jest.mock('../../src/services/import.service', () => ({
  parseCSV: jest.fn(),
  parseExcel: jest.fn(),
  parseVCard: jest.fn(),
  autoMapHeaders: jest.fn(),
  detectDuplicates: jest.fn(),
  executeImport: jest.fn(),
  MAPPABLE_FIELDS: [],
}))

jest.mock('csv-parse/sync', () => ({
  parse: jest.fn(),
}))

import { getLeads, getLead, createLead } from '../../src/controllers/lead.controller'
import { NotFoundError, ConflictError, ValidationError } from '../../src/middleware/errorHandler'

function mockReqRes(query = {}, body = {}, params = {}) {
  const req = {
    query,
    validatedQuery: query,
    body,
    params,
    user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'admin@test.com' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as unknown as Request
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return { req, res }
}

describe('lead.controller', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    jest.clearAllMocks()
  })

  // ── getLeads ────────────────────────────────────────────────────────────

  describe('getLeads', () => {
    it('returns paginated leads', async () => {
      const mockLeads = [
        { id: 'l1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
        { id: 'l2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      ]
      mockPrisma.lead.findMany.mockResolvedValue(mockLeads as any)
      mockPrisma.lead.count.mockResolvedValue(2)

      const { req, res } = mockReqRes({ page: 1, limit: 20 })
      await getLeads(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            leads: expect.arrayContaining([
              expect.objectContaining({ id: 'l1' }),
            ]),
            pagination: expect.objectContaining({
              total: 2,
            }),
          }),
        })
      )
    })

    it('applies status filter', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ status: 'NEW' })
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'NEW' }),
        })
      )
    })

    it('applies multiple comma-separated statuses', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ status: 'NEW,CONTACTED' })
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['NEW', 'CONTACTED'] },
          }),
        })
      )
    })

    it('applies score range filter', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ minScore: 50, maxScore: 90 })
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            score: { gte: 50, lte: 90 },
          }),
        })
      )
    })

    it('applies search filter across multiple fields', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ search: 'alice' })
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: 'alice', mode: 'insensitive' } }),
              expect.objectContaining({ email: { contains: 'alice', mode: 'insensitive' } }),
            ]),
          }),
        })
      )
    })

    it('enforces maximum limit of 200', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ limit: 999 })
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      )
    })

    it('defaults to page 1 and limit 20', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({})
      await getLeads(req, res)

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      )
    })
  })

  // ── getLead ─────────────────────────────────────────────────────────────

  describe('getLead', () => {
    it('returns a lead by ID', async () => {
      const mockLead = {
        id: 'l1',
        organizationId: 'org-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@test.com',
      }
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead as any)

      const { req, res } = mockReqRes({}, {}, { id: 'l1' })
      await getLead(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lead: expect.objectContaining({ id: 'l1' }),
          }),
        })
      )
    })

    it('throws NotFoundError when lead does not exist', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      const { req, res } = mockReqRes({}, {}, { id: 'nonexistent' })
      await expect(getLead(req, res)).rejects.toThrow(/not found/i)
    })

    it('scopes query to user organization', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      const { req, res } = mockReqRes({}, {}, { id: 'l1' })
      try { await getLead(req, res) } catch {}

      expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'l1',
            organizationId: 'org-1',
          }),
        })
      )
    })
  })

  // ── createLead ──────────────────────────────────────────────────────────

  describe('createLead', () => {
    const validBody = {
      firstName: 'New',
      lastName: 'Lead',
      email: 'new@test.com',
      phone: '555-0100',
      company: 'TestCo',
      source: 'WEBSITE',
    }

    it('creates a lead successfully', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null) // No duplicate
      mockPrisma.lead.create.mockResolvedValue({
        id: 'l-new',
        organizationId: 'org-1',
        ...validBody,
        status: 'NEW',
      } as any)

      const { req, res } = mockReqRes({}, validBody)
      await createLead(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lead: expect.objectContaining({ id: 'l-new' }),
          }),
        })
      )
    })

    it('throws ConflictError for duplicate email in same org', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'existing' } as any)

      const { req, res } = mockReqRes({}, validBody)
      await expect(createLead(req, res)).rejects.toThrow(/already exists/i)
    })

    it('throws ValidationError when assignedToId user not in org', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null) // No duplicate lead
      mockPrisma.user.findFirst.mockResolvedValue(null) // User not found

      const { req, res } = mockReqRes({}, { ...validBody, assignedToId: 'nonexistent-user' })
      await expect(createLead(req, res)).rejects.toThrow(/not found/i)
    })

    it('sets organizationId from authenticated user', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null)
      mockPrisma.lead.create.mockResolvedValue({ id: 'l-new', ...validBody } as any)

      const { req, res } = mockReqRes({}, validBody)
      await createLead(req, res)

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
          }),
        })
      )
    })
  })
})
