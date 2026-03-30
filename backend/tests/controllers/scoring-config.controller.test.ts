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
jest.mock('../../src/utils/errors', () => ({
  getErrorMessage: jest.fn((e: any) => e?.message || 'Unknown error'),
}))

import { getScoringConfig, updateScoringConfig, resetScoringConfig } from '../../src/controllers/scoring-config.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('scoring-config.controller', () => {
  describe('getScoringConfig', () => {
    it('returns scoring config', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.scoringConfig.findFirst.mockResolvedValue({ id: 'sc1', config: {} } as any)

      await getScoringConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateScoringConfig', () => {
    it('updates scoring config', async () => {
      const { req, res } = mockReqRes({}, { config: { emailWeight: 10, phoneWeight: 20 } })
      mockPrisma.scoringConfig.upsert.mockResolvedValue({ id: 'sc1' } as any)

      await updateScoringConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('resetScoringConfig', () => {
    it('resets to defaults', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.scoringConfig.upsert.mockResolvedValue({ id: 'sc1' } as any)

      await resetScoringConfig(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
