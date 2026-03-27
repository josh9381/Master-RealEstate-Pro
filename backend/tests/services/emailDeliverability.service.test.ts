import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient, BounceType, MessageStatus } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { recordBounce, recordSpamComplaint } from '../../src/services/emailDeliverability.service'

describe('emailDeliverability.service', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
  })

  describe('recordBounce', () => {
    it('updates message status to FAILED with bounce info', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue(null)

      const ts = new Date('2025-01-15T10:00:00Z')
      await recordBounce({ messageId: 'msg1', bounceType: BounceType.SOFT, reason: 'Mailbox full', timestamp: ts })

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg1' },
        data: {
          status: MessageStatus.FAILED,
          bouncedAt: ts,
          bounceType: BounceType.SOFT,
          bounceReason: 'Mailbox full',
        },
      })
    })

    it('suppresses lead email for hard bounce', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ toAddress: 'test@example.com', leadId: 'lead1' } as never)
      mockPrisma.lead.update.mockResolvedValue({} as never)

      const ts = new Date()
      await recordBounce({ messageId: 'msg2', bounceType: BounceType.HARD, reason: 'Invalid address', timestamp: ts })

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead1' },
        data: expect.objectContaining({ emailOptIn: false }),
      })
    })

    it('suppresses lead email for complaint bounce type', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ toAddress: 'c@c.com', leadId: 'lead2' } as never)
      mockPrisma.lead.update.mockResolvedValue({} as never)

      await recordBounce({ messageId: 'msg3', bounceType: BounceType.COMPLAINT, reason: 'Complaint', timestamp: new Date() })

      expect(mockPrisma.lead.update).toHaveBeenCalled()
    })

    it('does not suppress for soft bounce', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)

      await recordBounce({ messageId: 'msg4', bounceType: BounceType.SOFT, reason: 'Temp', timestamp: new Date() })

      expect(mockPrisma.message.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.lead.update).not.toHaveBeenCalled()
    })

    it('does not suppress when hard bounce message has no leadId', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ toAddress: 'x@x.com', leadId: null } as never)

      await recordBounce({ messageId: 'msg5', bounceType: BounceType.HARD, reason: 'Gone', timestamp: new Date() })

      expect(mockPrisma.lead.update).not.toHaveBeenCalled()
    })
  })

  describe('recordSpamComplaint', () => {
    it('updates message with COMPLAINT bounce type', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ leadId: 'lead3' } as never)
      mockPrisma.lead.update.mockResolvedValue({} as never)

      const ts = new Date()
      await recordSpamComplaint('msg6', ts)

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg6' },
        data: { spamComplaintAt: ts, bounceType: BounceType.COMPLAINT },
      })
    })

    it('suppresses lead email after spam complaint', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ leadId: 'lead4' } as never)
      mockPrisma.lead.update.mockResolvedValue({} as never)

      await recordSpamComplaint('msg7', new Date())

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead4' },
        data: expect.objectContaining({ emailOptIn: false }),
      })
    })

    it('does not suppress when spam complaint message has no leadId', async () => {
      mockPrisma.message.update.mockResolvedValue({} as never)
      mockPrisma.message.findUnique.mockResolvedValue({ leadId: null } as never)

      await recordSpamComplaint('msg8', new Date())

      expect(mockPrisma.lead.update).not.toHaveBeenCalled()
    })
  })
})
