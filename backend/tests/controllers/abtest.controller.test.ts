import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockABTestService = {
  getTestsByOrganization: jest.fn().mockResolvedValue([{ id: 'ab1', name: 'Subject Line Test', type: 'EMAIL_SUBJECT', organizationId: 'org-1' }]),
  getTestById: jest.fn().mockResolvedValue({ id: 'ab1', name: 'Subject Line Test', type: 'EMAIL_SUBJECT', organizationId: 'org-1' }),
  createTest: jest.fn().mockResolvedValue({ id: 'ab1', name: 'New Test', organizationId: 'org-1' }),
  deleteTest: jest.fn().mockResolvedValue(undefined),
  startTest: jest.fn().mockResolvedValue({ id: 'ab1', status: 'RUNNING' }),
  pauseTest: jest.fn().mockResolvedValue({ id: 'ab1', status: 'PAUSED' }),
  stopTest: jest.fn().mockResolvedValue({ id: 'ab1', status: 'COMPLETED' }),
  getTestResults: jest.fn().mockResolvedValue({ variantA: { opens: 100 }, variantB: { opens: 120 } }),
  analyzeTest: jest.fn().mockResolvedValue({ winner: 'B', confidence: 0.95 }),
  recordOpen: jest.fn().mockResolvedValue({ id: 'r1' }),
  recordClick: jest.fn().mockResolvedValue({ id: 'r1' }),
  recordReply: jest.fn().mockResolvedValue({ id: 'r1' }),
  recordConversion: jest.fn().mockResolvedValue({ id: 'r1' }),
}
jest.mock('../../src/services/abtest.service', () => ({
  getABTestService: jest.fn(() => mockABTestService),
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))
jest.mock('../../src/utils/errors', () => ({
  getErrorMessage: jest.fn((e: any) => e?.message || 'Unknown error'),
}))

import { getTests, getTest, createTest, deleteTest } from '../../src/controllers/abtest.controller'

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

describe('abtest.controller', () => {
  describe('getTests', () => {
    it('returns tests', async () => {
      const { req, res } = mockReqRes()

      await getTests(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getTest', () => {
    it('returns test by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'ab1' })

      await getTest(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createTest', () => {
    it('creates ab test', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Test', type: 'EMAIL_SUBJECT',
        variantA: { name: 'A', content: 'Hello' },
        variantB: { name: 'B', content: 'Hi there' },
      })

      await createTest(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('deleteTest', () => {
    it('deletes test', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'ab1' })

      await deleteTest(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
