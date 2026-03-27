import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }))

import { calculateOptimalSendTimes, groupLeadsBySendSlot } from '../../src/services/send-time-optimizer.service'

describe('send-time-optimizer.service', () => {
  beforeEach(() => mockReset(mockPrisma))

  describe('calculateOptimalSendTimes — none strategy', () => {
    it('returns all slots at baseDate when strategy=none', async () => {
      const base = new Date('2025-06-01T12:00:00Z')
      const result = await calculateOptimalSendTimes(['lead1', 'lead2', 'lead3'], 'none', base)
      expect(result.strategy).toBe('none')
      expect(result.totalSlots).toBe(3)
      expect(result.uniqueTimeSlots).toBe(1) // all at same time
      result.slots.forEach((slot) => {
        expect(slot.sendAt.getTime()).toBe(base.getTime())
        expect(slot.reason).toBe('No optimization')
      })
    })

    it('returns empty slots for empty leadIds array', async () => {
      const result = await calculateOptimalSendTimes([], 'none', new Date())
      expect(result.totalSlots).toBe(0)
      expect(result.uniqueTimeSlots).toBe(1) // single "no optimization" bucket
    })
  })

  describe('calculateOptimalSendTimes — timezone strategy', () => {
    it('uses lead timezone to set target hour', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead1', timezone: 'America/New_York' },
      ] as never)

      const base = new Date('2025-06-01T15:00:00Z')
      const result = await calculateOptimalSendTimes(['lead1'], 'timezone', base, { targetHour: 10 })

      expect(result.slots.has('lead1')).toBe(true)
      const slot = result.slots.get('lead1')!
      expect(slot.reason).toContain('Timezone')
      expect(slot.reason).toContain('10:00')
    })

    it('falls back to America/New_York for leads without timezone', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead2', timezone: null },
      ] as never)

      const base = new Date('2025-06-01T15:00:00Z')
      const result = await calculateOptimalSendTimes(['lead2'], 'timezone', base, { targetHour: 9 })

      expect(result.slots.has('lead2')).toBe(true)
      const slot = result.slots.get('lead2')!
      expect(slot.reason).toContain('America/New_York')
    })
  })

  describe('groupLeadsBySendSlot', () => {
    it('groups leads into 15-minute buckets', () => {
      const slots = new Map([
        ['lead1', { leadId: 'lead1', sendAt: new Date('2025-06-01T10:03:00Z'), reason: 'r1' }],
        ['lead2', { leadId: 'lead2', sendAt: new Date('2025-06-01T10:07:00Z'), reason: 'r2' }],
        ['lead3', { leadId: 'lead3', sendAt: new Date('2025-06-01T10:20:00Z'), reason: 'r3' }],
      ])

      const groups = groupLeadsBySendSlot(slots)
      // lead1 and lead2 both round to 10:00 (0-14 min range)
      // lead3 rounds to 10:15
      expect(groups.size).toBe(2)
      // Find the bucket that has 2 leads
      const buckets = Array.from(groups.values())
      expect(buckets.some((leads) => leads.length === 2)).toBe(true)
      expect(buckets.some((leads) => leads.length === 1)).toBe(true)
    })

    it('returns empty map for empty slots', () => {
      const groups = groupLeadsBySendSlot(new Map())
      expect(groups.size).toBe(0)
    })
  })
})
