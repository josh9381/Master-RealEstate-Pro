import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'jest-mock-extended'

const mockPrisma = mockDeep<PrismaClient>()

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: () => ({
    chat: jest.fn().mockResolvedValue({
      response: JSON.stringify({
        subject: 'Personalized Subject',
        message: 'Hi John, here is your custom listing update.',
        changes: ['Replaced lead name', 'Adjusted tone'],
      }),
      tokens: 200,
      cost: 0.004,
    }),
  }),
}))

jest.mock('../../src/services/message-context.service', () => ({
  gatherMessageContext: jest.fn().mockResolvedValue({
    lead: {
      name: 'John Doe',
      email: 'john@test.com',
      phone: null,
      status: 'CONTACTED',
      score: 70,
      interests: [],
      budget: null,
      location: null,
      tags: [],
    },
    engagement: {
      lastContact: null,
      totalMessages: 3,
      openRate: 50,
      responseRate: 40,
      avgResponseTime: 6,
    },
    conversation: { recentMessages: [] },
    properties: [],
  }),
}))

import { generateFromTemplate } from '../../src/services/template-ai.service'

describe('template-ai.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws when template not found', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue(null)
    await expect(
      generateFromTemplate('bad-id', {}, 'professional', 'user1', 'org1')
    ).rejects.toThrow(/not found/i)
  })

  it('generates personalized message from template', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({
      id: 'tpl1',
      name: 'Welcome Template',
      category: 'welcome',
      subject: 'Welcome!',
      content: 'Hello [NAME], welcome to our listings.',
      organizationId: 'org1',
      createdBy: 'user1',
      createdAt: new Date(),
    } as any)

    const result = await generateFromTemplate(
      'tpl1',
      { leadId: 'lead1', conversationId: 'conv1' },
      'professional',
      'user1',
      'org1'
    )
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('changes')
    expect(Array.isArray(result.changes)).toBe(true)
  })

  it('works without lead context', async () => {
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({
      id: 'tpl1',
      name: 'Generic Template',
      category: 'general',
      subject: null,
      content: 'Hello there!',
      organizationId: 'org1',
      createdBy: 'user1',
      createdAt: new Date(),
    } as any)

    const result = await generateFromTemplate('tpl1', {}, 'friendly', 'user1', 'org1')
    expect(result).toHaveProperty('message')
  })
})
