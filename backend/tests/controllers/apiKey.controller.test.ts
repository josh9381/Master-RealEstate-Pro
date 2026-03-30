import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))
jest.mock('../../src/utils/apiKeyAudit', () => ({
  logAPIKeyAccess: jest.fn().mockResolvedValue(undefined),
}))

import { generateAPIKey, listAPIKeys, revokeAPIKey } from '../../src/controllers/apiKey.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('apiKey.controller', () => {
  describe('listAPIKeys', () => {
    it('returns api keys', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.aPIKey.findMany.mockResolvedValue([{ id: 'k1', name: 'Production' }] as any)

      await listAPIKeys(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('generateAPIKey', () => {
    it('generates a new key', async () => {
      const { req, res } = mockReqRes({}, { name: 'New Key' })
      mockPrisma.aPIKey.create.mockResolvedValue({ id: 'k1', name: 'New Key', key: 'mrep_test123' } as any)

      await generateAPIKey(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('revokeAPIKey', () => {
    it('revokes api key', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'k1' })
      mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k1' } as any)
      mockPrisma.aPIKey.delete.mockResolvedValue({ id: 'k1' } as any)

      await revokeAPIKey(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
