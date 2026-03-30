import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'

const mockPrisma = mockDeep<PrismaClient>()

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

jest.mock('../../src/services/email.service', () => ({
  sendBulkEmails: jest.fn().mockResolvedValue({ sent: 5, failed: 0, results: [] }),
}))

jest.mock('../../src/services/sms.service', () => ({
  sendBulkSMS: jest.fn().mockResolvedValue({ sent: 3, failed: 0 }),
}))

jest.mock('../../src/config/socket', () => ({
  pushCampaignUpdate: jest.fn(),
}))

jest.mock('../../src/utils/mjmlCompiler', () => ({
  compileEmailBlocks: jest.fn().mockReturnValue('<html>compiled</html>'),
  compilePlainText: jest.fn().mockReturnValue('plain text'),
  CanSpamOptions: {},
}))

jest.mock('../../src/config/upload', () => ({
  readAttachmentAsBase64: jest.fn().mockResolvedValue('base64data'),
}))

jest.mock('../../src/controllers/unsubscribe.controller', () => ({
  ensureUnsubscribeToken: jest.fn().mockResolvedValue('unsub-token'),
}))

jest.mock('../../src/services/send-time-optimizer.service', () => ({
  calculateOptimalSendTimes: jest.fn().mockResolvedValue([]),
  groupLeadsBySendSlot: jest.fn().mockReturnValue(new Map()),
}))

jest.mock('../../src/middleware/planLimits', () => ({
  checkMonthlyMessageLimit: jest.fn().mockResolvedValue(true),
}))

jest.mock('handlebars', () => ({
  compile: jest.fn().mockReturnValue((data: any) => `compiled: ${JSON.stringify(data)}`),
}))

import { executeCampaign } from '../../src/services/campaign-executor.service'

describe('campaign-executor.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns failure when campaign is not found', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue(null)
    const result = await executeCampaign({ campaignId: 'camp1' })
    expect(result.success).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/not found/i)]))
  })

  it('returns result when campaign has no leads to send to', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp1',
      type: 'EMAIL',
      status: 'ACTIVE',
      organizationId: 'org1',
      subject: 'Test',
      content: '<p>Hello</p>',
      emailBlocks: null,
      tags: [],
      user: { id: 'user1' },
      attachments: [],
    } as any)
    mockPrisma.lead.findMany.mockResolvedValue([])

    const result = await executeCampaign({ campaignId: 'camp1' })
    expect(result).toHaveProperty('success')
    expect(result.totalLeads).toBe(0)
  })
})
