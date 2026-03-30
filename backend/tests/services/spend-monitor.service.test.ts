import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }))
jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))
jest.mock('../../src/utils/ai-logger', () => ({ aiLogger: { spendAlert: jest.fn() } }))
jest.mock('../../src/services/ai-config.service', () => ({
  calculateCost: jest.fn().mockReturnValue(100),
  MODEL_TIERS: { mainModel: 'gpt-4' },
}))
jest.mock('../../src/utils/metricsCalculator', () => ({
  calcRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcProgress: jest.fn((a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)),
}))

import { checkPlatformSpend, checkOrgSpend, getSpendSummary } from '../../src/services/spend-monitor.service'
import { aiLogger } from '../../src/utils/ai-logger'

beforeEach(() => {
  mockReset(mockPrisma)
  jest.clearAllMocks()
})

describe('spend-monitor.service', () => {
  describe('checkPlatformSpend', () => {
    it('does nothing when spend is below 80% threshold', async () => {
      mockPrisma.usageTracking.aggregate.mockResolvedValue({
        _sum: { totalCost: 100 },
        _avg: {} as any, _count: {} as any, _max: {} as any, _min: {} as any,
      })
      await checkPlatformSpend()
      expect(aiLogger.spendAlert).not.toHaveBeenCalled()
    })

    it('alerts when spend exceeds threshold', async () => {
      mockPrisma.usageTracking.aggregate.mockResolvedValue({
        _sum: { totalCost: 600 },
        _avg: {} as any, _count: {} as any, _max: {} as any, _min: {} as any,
      })
      await checkPlatformSpend()
      expect(aiLogger.spendAlert).toHaveBeenCalled()
    })
  })

  describe('checkOrgSpend', () => {
    it('returns spend info with no budget when org has none', async () => {
      mockPrisma.usageTracking.findFirst.mockResolvedValue({ totalCost: 50, totalTokensUsed: 1000 } as any)
      mockPrisma.organization.findUnique.mockResolvedValue({ aiMonthlyTokenBudget: null } as any)

      const result = await checkOrgSpend('org-1')
      expect(result.spend).toBe(50)
      expect(result.budget).toBeNull()
      expect(result.overBudget).toBe(false)
    })

    it('returns percentUsed when org has budget', async () => {
      mockPrisma.usageTracking.findFirst.mockResolvedValue({ totalCost: 80, totalTokensUsed: 5000 } as any)
      mockPrisma.organization.findUnique.mockResolvedValue({ aiMonthlyTokenBudget: 10000 } as any)

      const result = await checkOrgSpend('org-1')
      expect(result.spend).toBe(80)
      expect(result.budget).toBe(10000)
      expect(typeof result.percentUsed).toBe('number')
    })

    it('returns 0 spend when no usage found', async () => {
      mockPrisma.usageTracking.findFirst.mockResolvedValue(null)
      mockPrisma.organization.findUnique.mockResolvedValue({ aiMonthlyTokenBudget: null } as any)

      const result = await checkOrgSpend('org-1')
      expect(result.spend).toBe(0)
    })
  })

  describe('getSpendSummary', () => {
    it('returns platform total and top orgs', async () => {
      mockPrisma.usageTracking.findMany.mockResolvedValue([
        {
          totalCost: 200,
          subscription: { organization: { id: 'org-1', name: 'Org 1' } },
        },
        {
          totalCost: 100,
          subscription: { organization: { id: 'org-2', name: 'Org 2' } },
        },
      ] as any)

      const result = await getSpendSummary()
      expect(result.platformTotal).toBe(300)
      expect(result.topOrgs).toHaveLength(2)
      expect(result.topOrgs[0].name).toBe('Org 1')
    })
  })
})
