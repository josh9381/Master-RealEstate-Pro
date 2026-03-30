import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }))
jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

import { gatherMessageContext } from '../../src/services/message-context.service'

beforeEach(() => {
  mockReset(mockPrisma)
})

describe('message-context.service', () => {
  const orgId = 'org-1'
  const leadId = 'lead-1'
  const convId = 'conv-1'

  describe('gatherMessageContext', () => {
    it('gathers context when lead exists', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        score: 75,
        status: 'QUALIFIED',
        tags: [{ name: 'hot' }],
        activities: [],
        notes: [],
        budget: 500000,
        city: 'Miami',
        propertyType: 'Condo',
        timeline: '3 months',
      } as any)

      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'm1', direction: 'OUTBOUND', content: 'Hey', createdAt: new Date(), read: true },
        { id: 'm2', direction: 'INBOUND', content: 'Hi back', createdAt: new Date(), read: true },
      ] as any)

      mockPrisma.message.count.mockResolvedValue(10)

      const ctx = await gatherMessageContext(leadId, convId, orgId)
      expect(ctx).toBeDefined()
      expect(ctx.lead.id).toBe(leadId)
      expect(ctx.lead.name).toContain('John')
    })

    it('builds fallback context when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null)
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'm1', direction: 'OUTBOUND', content: 'Hello', createdAt: new Date() },
      ] as any)
      mockPrisma.message.count.mockResolvedValue(1)

      const ctx = await gatherMessageContext(leadId, convId, orgId)
      expect(ctx).toBeDefined()
      expect(ctx.lead.id).toBe(leadId)
    })
  })
})
