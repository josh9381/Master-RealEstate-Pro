import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }))
jest.mock('../../src/utils/metricsCalculator', () => ({
  calcOpenRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcClickRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcConversionRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcDeliveryRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcBounceRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
  calcRate: jest.fn((a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)),
}))

import { getCampaignMetrics, updateCampaignMetrics } from '../../src/services/campaignAnalytics.service'

beforeEach(() => {
  mockReset(mockPrisma)
})

describe('campaignAnalytics.service', () => {
  describe('getCampaignMetrics', () => {
    it('calculates metrics from activities', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { type: 'EMAIL_SENT', metadata: { messageId: 'm1' } },
        { type: 'EMAIL_SENT', metadata: { messageId: 'm2' } },
        { type: 'EMAIL_OPENED', metadata: {} },
        { type: 'EMAIL_CLICKED', metadata: {} },
      ] as any)

      mockPrisma.message.findMany.mockResolvedValue([
        { deliveredAt: new Date(), bouncedAt: null },
        { deliveredAt: new Date(), bouncedAt: null },
      ] as any)

      mockPrisma.campaign.findUnique.mockResolvedValue({
        converted: 1,
        unsubscribed: 0,
      } as any)

      const metrics = await getCampaignMetrics('camp-1')
      expect(metrics.sent).toBe(2)
      expect(metrics.delivered).toBe(2)
      expect(metrics.opened).toBe(1)
      expect(metrics.clicked).toBe(1)
      expect(metrics.converted).toBe(1)
      expect(metrics.bounced).toBe(0)
    })

    it('handles campaign with no activities', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([])
      mockPrisma.campaign.findUnique.mockResolvedValue({ converted: 0, unsubscribed: 0 } as any)

      const metrics = await getCampaignMetrics('camp-1')
      expect(metrics.sent).toBe(0)
      expect(metrics.opened).toBe(0)
    })

    it('handles null campaign', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([])
      mockPrisma.campaign.findUnique.mockResolvedValue(null)

      const metrics = await getCampaignMetrics('camp-1')
      expect(metrics.converted).toBe(0)
      expect(metrics.unsubscribed).toBe(0)
    })
  })

  describe('updateCampaignMetrics', () => {
    it('recalculates and saves metrics', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { type: 'EMAIL_SENT', metadata: {} },
      ] as any)
      mockPrisma.campaign.findUnique.mockResolvedValue({ converted: 0, unsubscribed: 0 } as any)
      mockPrisma.campaign.update.mockResolvedValue({} as any)

      await updateCampaignMetrics('camp-1')
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-1' },
          data: expect.objectContaining({ sent: 1 }),
        })
      )
    })
  })
})
