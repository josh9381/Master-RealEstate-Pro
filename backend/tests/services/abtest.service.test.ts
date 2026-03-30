import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient, ABTestStatus } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ prisma: mockPrisma }))
jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
}))

import { ABTestService } from '../../src/services/abtest.service'

const service = new ABTestService()

beforeEach(() => {
  mockReset(mockPrisma)
})

describe('abtest.service', () => {
  describe('createTest', () => {
    it('creates an AB test with DRAFT status', async () => {
      const input = {
        name: 'Subject Line Test',
        type: 'SUBJECT_LINE' as any,
        organizationId: 'org-1',
        createdBy: 'user-1',
        variantA: { subject: 'Hello A' },
        variantB: { subject: 'Hello B' },
      }

      mockPrisma.aBTest.create.mockResolvedValue({
        id: 'test-1',
        ...input,
        status: ABTestStatus.DRAFT,
        confidence: 95,
      } as any)

      const result = await service.createTest(input)
      expect(result.status).toBe('DRAFT')
      expect(mockPrisma.aBTest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Subject Line Test', status: 'DRAFT' }),
        })
      )
    })

    it('uses custom confidence level when provided', async () => {
      const input = {
        name: 'Test',
        type: 'CONTENT' as any,
        organizationId: 'org-1',
        createdBy: 'user-1',
        variantA: {},
        variantB: {},
        confidenceLevel: 90,
      }

      mockPrisma.aBTest.create.mockResolvedValue({ id: 'test-1', confidence: 90 } as any)

      await service.createTest(input)
      expect(mockPrisma.aBTest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confidence: 90 }),
        })
      )
    })
  })

  describe('startTest', () => {
    it('updates test status to RUNNING', async () => {
      mockPrisma.aBTest.findUnique.mockResolvedValue({ startDate: null } as any)
      mockPrisma.aBTest.update.mockResolvedValue({ id: 'test-1', status: ABTestStatus.RUNNING } as any)

      const result = await service.startTest('test-1')
      expect(result.status).toBe('RUNNING')
      expect(mockPrisma.aBTest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RUNNING' }),
        })
      )
    })
  })
})
