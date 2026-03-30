import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  PrismaClient: jest.fn(() => mockPrisma),
}))
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { getPipelines, getPipeline, createPipeline, deletePipeline } from '../../src/controllers/pipeline.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('pipeline.controller', () => {
  describe('getPipelines', () => {
    it('returns pipelines with stages', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.pipeline.findMany.mockResolvedValue([
        { id: 'p1', name: 'Sales Pipeline', stages: [{ id: 's1', name: 'New' }] },
      ] as any)

      await getPipelines(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('auto-seeds if no pipelines exist', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.pipeline.findMany
        .mockResolvedValueOnce([]) // first call - no pipelines
        .mockResolvedValueOnce([{ id: 'p1', name: 'Default' }] as any) // after seed
      mockPrisma.pipeline.create.mockResolvedValue({ id: 'p1' } as any)

      await getPipelines(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getPipeline', () => {
    it('returns single pipeline', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'p1' })
      mockPrisma.pipeline.findFirst.mockResolvedValue({
        id: 'p1', name: 'Sales', stages: [],
      } as any)

      await getPipeline(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('returns 404 for missing pipeline', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'missing' })
      mockPrisma.pipeline.findFirst.mockResolvedValue(null)

      await getPipeline(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createPipeline', () => {
    it('creates pipeline with stages', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Pipeline',
        stages: [{ name: 'Start', order: 0 }],
      })
      mockPrisma.pipeline.create.mockResolvedValue({ id: 'p1', name: 'New Pipeline' } as any)

      await createPipeline(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('deletePipeline', () => {
    it('deletes pipeline and clears lead references', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'p1' })
      mockPrisma.pipeline.findFirst.mockResolvedValue({ id: 'p1', _count: { leads: 0 } } as any)
      mockPrisma.lead.updateMany.mockResolvedValue({ count: 0 } as any)
      mockPrisma.pipeline.delete.mockResolvedValue({ id: 'p1' } as any)

      await deletePipeline(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
