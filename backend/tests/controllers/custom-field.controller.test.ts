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

import { getCustomFields, createCustomField, updateCustomField, deleteCustomField } from '../../src/controllers/custom-field.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('custom-field.controller', () => {
  describe('getCustomFields', () => {
    it('returns custom fields ordered by order', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue([
        { id: 'f1', name: 'Budget', order: 0 },
      ] as any)

      await getCustomFields(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('createCustomField', () => {
    it('creates custom field and returns 201', async () => {
      const { req, res } = mockReqRes({}, { name: 'Budget', type: 'NUMBER' })
      mockPrisma.customFieldDefinition.findFirst.mockResolvedValue(null) // no duplicate
      mockPrisma.customFieldDefinition.aggregate.mockResolvedValue({ _max: { order: 0 } } as any)
      mockPrisma.customFieldDefinition.create.mockResolvedValue({ id: 'f1', name: 'Budget' } as any)

      await createCustomField(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws ConflictError for duplicate fieldKey', async () => {
      const { req, res } = mockReqRes({}, { name: 'Budget', type: 'NUMBER', fieldKey: 'budget' })
      mockPrisma.customFieldDefinition.findFirst.mockResolvedValue({ id: 'existing' } as any)

      await expect(createCustomField(req, res)).rejects.toThrow(/already|duplicate|exists/i)
    })
  })

  describe('updateCustomField', () => {
    it('updates custom field', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 'f1' })
      mockPrisma.customFieldDefinition.findFirst.mockResolvedValue({ id: 'f1' } as any)
      mockPrisma.customFieldDefinition.update.mockResolvedValue({ id: 'f1', name: 'Updated' } as any)

      await updateCustomField(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError for missing field', async () => {
      const { req, res } = mockReqRes({}, { name: 'X' }, { id: 'missing' })
      mockPrisma.customFieldDefinition.findFirst.mockResolvedValue(null)

      await expect(updateCustomField(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('deleteCustomField', () => {
    it('deletes custom field', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'f1' })
      mockPrisma.customFieldDefinition.findFirst.mockResolvedValue({ id: 'f1' } as any)
      mockPrisma.customFieldDefinition.delete.mockResolvedValue({ id: 'f1' } as any)

      await deleteCustomField(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
