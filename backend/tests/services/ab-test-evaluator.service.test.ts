import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { getVariantStats, evaluateABTest } from '../../src/services/ab-test-evaluator.service'

describe('ab-test-evaluator.service', () => {
  beforeEach(() => mockReset(mockPrisma))

  describe('getVariantStats', () => {
    it('correctly counts opens and clicks per variant', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([
        { variant: 'A', openedAt: new Date(), clickedAt: new Date() },
        { variant: 'A', openedAt: new Date(), clickedAt: null },
        { variant: 'A', openedAt: null, clickedAt: null },
        { variant: 'B', openedAt: new Date(), clickedAt: null },
        { variant: 'B', openedAt: null, clickedAt: null },
      ])

      const { A, B } = await getVariantStats('test1')
      expect(A.total).toBe(3)
      expect(A.opened).toBe(2)
      expect(A.clicked).toBe(1)
      expect(B.total).toBe(2)
      expect(B.opened).toBe(1)
      expect(B.clicked).toBe(0)
    })

    it('returns zero rates when no results', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([])

      const { A, B } = await getVariantStats('test2')
      expect(A.total).toBe(0)
      expect(A.openRate).toBe(0)
      expect(B.total).toBe(0)
      expect(B.openRate).toBe(0)
    })
  })

  describe('evaluateABTest', () => {
    it('picks A as winner when A has clearly higher open rate', async () => {
      // A: 80/100 opens. B: 20/100 opens. A should win.
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([
        ...Array(80).fill({ variant: 'A', openedAt: new Date(), clickedAt: null }),
        ...Array(20).fill({ variant: 'A', openedAt: null, clickedAt: null }),
        ...Array(20).fill({ variant: 'B', openedAt: new Date(), clickedAt: null }),
        ...Array(80).fill({ variant: 'B', openedAt: null, clickedAt: null }),
      ])

      const result = await evaluateABTest('test3', 'open_rate')
      expect(result.winner).toBe('A')
      expect(result.winnerMetric).toBe('open_rate')
    })

    it('picks B as winner when B has clearly higher open rate', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([
        ...Array(20).fill({ variant: 'A', openedAt: new Date(), clickedAt: null }),
        ...Array(80).fill({ variant: 'A', openedAt: null, clickedAt: null }),
        ...Array(80).fill({ variant: 'B', openedAt: new Date(), clickedAt: null }),
        ...Array(20).fill({ variant: 'B', openedAt: null, clickedAt: null }),
      ])

      const result = await evaluateABTest('test4', 'open_rate')
      expect(result.winner).toBe('B')
    })

    it('declares TIE when rates are equal', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([
        ...Array(50).fill({ variant: 'A', openedAt: new Date(), clickedAt: null }),
        ...Array(50).fill({ variant: 'A', openedAt: null, clickedAt: null }),
        ...Array(50).fill({ variant: 'B', openedAt: new Date(), clickedAt: null }),
        ...Array(50).fill({ variant: 'B', openedAt: null, clickedAt: null }),
      ])

      const result = await evaluateABTest('test5', 'open_rate')
      expect(result.winner).toBe('TIE')
    })

    it('uses click_rate metric when specified', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([
        ...Array(90).fill({ variant: 'A', openedAt: null, clickedAt: new Date() }),
        ...Array(10).fill({ variant: 'A', openedAt: null, clickedAt: null }),
        ...Array(10).fill({ variant: 'B', openedAt: null, clickedAt: new Date() }),
        ...Array(90).fill({ variant: 'B', openedAt: null, clickedAt: null }),
      ])

      const result = await evaluateABTest('test6', 'click_rate')
      expect(result.winnerMetric).toBe('click_rate')
      expect(result.winner).toBe('A')
    })

    it('returns all required fields', async () => {
      ;(mockPrisma.aBTestResult.findMany as jest.Mock).mockResolvedValue([])

      const result = await evaluateABTest('test7')
      expect(result).toHaveProperty('testId', 'test7')
      expect(result).toHaveProperty('variantA')
      expect(result).toHaveProperty('variantB')
      expect(result).toHaveProperty('winner')
      expect(result).toHaveProperty('winnerMetric')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('marginPercent')
    })
  })
})
