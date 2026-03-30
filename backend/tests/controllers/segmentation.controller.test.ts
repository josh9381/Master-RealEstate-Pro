import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockSegService = {
  getSegments: jest.fn(),
  createSegment: jest.fn(),
  getSegmentById: jest.fn(),
  updateSegment: jest.fn(),
  deleteSegment: jest.fn(),
  getSegmentMembers: jest.fn(),
  refreshSegmentCounts: jest.fn(),
}
jest.mock('../../src/services/segmentation.service', () => ({
  __esModule: true,
  default: mockSegService,
  ...mockSegService,
}))

import { list, create, getById, update, remove } from '../../src/controllers/segmentation.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('segmentation.controller', () => {
  describe('list', () => {
    it('returns segments', async () => {
      const { req, res } = mockReqRes()
      mockSegService.getSegments.mockResolvedValue([{ id: 's1', name: 'Active' }])

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('create', () => {
    it('creates segment', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Segment',
        rules: [{ field: 'status', operator: 'equals', value: 'ACTIVE' }],
      })
      mockSegService.createSegment.mockResolvedValue({ id: 's1', name: 'New Segment' })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 400 for empty rules', async () => {
      const { req, res } = mockReqRes({}, { name: 'Bad Segment', rules: [] })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('getById', () => {
    it('returns segment by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 's1' })
      mockSegService.getSegmentById.mockResolvedValue({ id: 's1', name: 'Active' })

      await getById(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('update', () => {
    it('updates segment', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 's1' })
      mockSegService.updateSegment.mockResolvedValue({ id: 's1', name: 'Updated' })

      await update(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('remove', () => {
    it('removes segment', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 's1' })
      mockSegService.deleteSegment.mockResolvedValue(undefined)

      await remove(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
