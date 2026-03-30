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

jest.mock('../../src/services/campaign-executor.service', () => ({
  executeCampaign: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/data/campaign-templates', () => ({
  getAllTemplates: jest.fn(() => []),
  getTemplateById: jest.fn(),
  trackTemplateUsage: jest.fn(),
}))

jest.mock('../../src/utils/roleFilters', () => ({
  getCampaignsFilter: jest.fn((roleFilter) => ({
    organizationId: roleFilter.organizationId,
    isArchived: false,
  })),
  getRoleFilterFromRequest: jest.fn(() => ({ organizationId: 'org-1', role: 'ADMIN' })),
}))

jest.mock('../../src/utils/metricsCalculator', () => ({
  calcOpenRate: jest.fn((o, s) => (s > 0 ? (o / s) * 100 : 0)),
  calcClickRate: jest.fn((c, s) => (s > 0 ? (c / s) * 100 : 0)),
  calcConversionRate: jest.fn((c, s) => (s > 0 ? (c / s) * 100 : 0)),
  calcBounceRate: jest.fn((b, s) => (s > 0 ? (b / s) * 100 : 0)),
  calcROI: jest.fn((r, sp) => (sp > 0 ? ((r - sp) / sp) * 100 : 0)),
  formatRate: jest.fn((r) => r.toFixed(2)),
}))

jest.mock('../../src/utils/mjmlCompiler', () => ({
  compileEmailBlocks: jest.fn(() => '<html>compiled</html>'),
  compilePlainText: jest.fn(() => 'plain text'),
}))

jest.mock('../../src/services/segmentation.service', () => ({
  getSegmentById: jest.fn(),
}))

import { getCampaigns, getCampaign, createCampaign } from '../../src/controllers/campaign.controller'
import { NotFoundError, ForbiddenError } from '../../src/middleware/errorHandler'

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

describe('campaign.controller', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
    jest.clearAllMocks()
  })

  // ── getCampaigns ────────────────────────────────────────────────────────

  describe('getCampaigns', () => {
    it('returns paginated campaigns with metrics', async () => {
      const mockCampaigns = [
        {
          id: 'c1', name: 'Campaign 1', status: 'ACTIVE', type: 'EMAIL',
          sent: 100, opened: 30, clicked: 10, converted: 2, bounced: 5,
          revenue: 500, spent: 100, roi: null, isArchived: false,
        },
      ]
      mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns as any)
      mockPrisma.campaign.count.mockResolvedValue(1)

      const { req, res } = mockReqRes({ page: 1, limit: 20 })
      await getCampaigns(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            campaigns: expect.arrayContaining([
              expect.objectContaining({
                id: 'c1',
                metrics: expect.objectContaining({
                  openRate: expect.any(String),
                  clickRate: expect.any(String),
                }),
              }),
            ]),
            pagination: expect.objectContaining({
              total: 1,
            }),
          }),
        })
      )
    })

    it('applies status filter', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([])
      mockPrisma.campaign.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ status: 'ACTIVE' })
      await getCampaigns(req, res)

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('applies search filter on name and subject', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([])
      mockPrisma.campaign.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ search: 'welcome' })
      await getCampaigns(req, res)

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              expect.objectContaining({ name: { contains: 'welcome', mode: 'insensitive' } }),
              expect.objectContaining({ subject: { contains: 'welcome', mode: 'insensitive' } }),
            ],
          }),
        })
      )
    })

    it('uses safe sort fields', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([])
      mockPrisma.campaign.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ sortBy: 'name', sortOrder: 'asc' })
      await getCampaigns(req, res)

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      )
    })

    it('falls back to createdAt for unknown sort fields', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([])
      mockPrisma.campaign.count.mockResolvedValue(0)

      const { req, res } = mockReqRes({ sortBy: 'malicious_field' })
      await getCampaigns(req, res)

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  // ── getCampaign ─────────────────────────────────────────────────────────

  describe('getCampaign', () => {
    it('returns a campaign by ID with metrics', async () => {
      const mockCampaign = {
        id: 'c1', name: 'Test Campaign', status: 'ACTIVE',
        sent: 100, opened: 30, clicked: 10, converted: 2, bounced: 5,
        revenue: null, spent: null,
      }
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign as any)

      const { req, res } = mockReqRes({}, {}, { id: 'c1' })
      await getCampaign(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            campaign: expect.objectContaining({
              id: 'c1',
              metrics: expect.objectContaining({
                openRate: expect.any(String),
              }),
            }),
          }),
        })
      )
    })

    it('throws NotFoundError when campaign does not exist', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null)

      const { req, res } = mockReqRes({}, {}, { id: 'nonexistent' })
      await expect(getCampaign(req, res)).rejects.toThrow(/not found/i)
    })

    it('scopes query to user organization', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null)

      const { req, res } = mockReqRes({}, {}, { id: 'c1' })
      try { await getCampaign(req, res) } catch {}

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'c1',
            organizationId: 'org-1',
          }),
        })
      )
    })
  })

  // ── createCampaign ──────────────────────────────────────────────────────

  describe('createCampaign', () => {
    const validBody = {
      name: 'New Campaign',
      type: 'EMAIL',
      subject: 'Hello!',
      body: '<p>Content</p>',
    }

    it('creates a campaign successfully', async () => {
      mockPrisma.campaign.create.mockResolvedValue({
        id: 'c-new',
        organizationId: 'org-1',
        ...validBody,
        status: 'DRAFT',
      } as any)

      const { req, res } = mockReqRes({}, validBody)
      await createCampaign(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            campaign: expect.objectContaining({ id: 'c-new' }),
          }),
        })
      )
    })

    it('throws ForbiddenError when user is not authenticated', async () => {
      const { req, res } = mockReqRes({}, validBody)
      req.user = undefined as any

      await expect(createCampaign(req, res)).rejects.toThrow(/authentication required/i)
    })

    it('rejects SOCIAL campaign type', async () => {
      const { req, res } = mockReqRes({}, { ...validBody, type: 'SOCIAL' })
      await createCampaign(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Social media campaigns'),
        })
      )
    })

    it('sets organizationId from authenticated user', async () => {
      mockPrisma.campaign.create.mockResolvedValue({ id: 'c-new', ...validBody } as any)

      const { req, res } = mockReqRes({}, validBody)
      await createCampaign(req, res)

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
          }),
        })
      )
    })

    it('defaults status to DRAFT', async () => {
      mockPrisma.campaign.create.mockResolvedValue({ id: 'c-new', ...validBody } as any)

      const { req, res } = mockReqRes({}, validBody)
      await createCampaign(req, res)

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
          }),
        })
      )
    })
  })
})
