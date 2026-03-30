import { generateContextualMessage, ComposeSettings, ComposeResult } from '../../src/services/ai-compose.service'
import { MessageContext } from '../../src/services/message-context.service'

// Mock dependencies
jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: () => ({
    chat: jest.fn().mockResolvedValue({
      response: 'Subject: Quick Follow Up\n\nHi John, just wanted to check in...',
      tokens: 150,
      cost: 0.003
    })
  })
}))

jest.mock('../../src/services/prediction.service', () => ({
  predictResponseRate: jest.fn().mockReturnValue(65),
  generatePredictionReasoning: jest.fn().mockReturnValue('Good engagement')
}))

jest.mock('../../src/services/suggestions.service', () => ({
  generateSmartSuggestions: jest.fn().mockReturnValue([
    { type: 'timing', text: 'Send in the morning', priority: 'medium' }
  ])
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

describe('ai-compose.service', () => {
  const mockContext: MessageContext = {
    lead: {
      id: 'lead1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      status: 'CONTACTED',
      score: 75,
      interests: ['3BR homes', 'Downtown area'],
      budget: 500000,
      location: 'Miami, FL',
    },
    engagement: {
      lastContact: new Date('2025-12-01'),
      totalMessages: 8,
      openRate: 80,
      responseRate: 60,
      avgResponseTime: 4,
    },
    conversation: {
      id: 'conv1',
      messageCount: 2,
      recentMessages: [
        { role: 'user', content: 'I am interested in your listing', timestamp: new Date() },
        { role: 'assistant', content: 'Happy to help!', timestamp: new Date() },
      ],
    },
    properties: [
      { id: 'p1', address: '123 Main St', price: 450000, type: 'house', viewed: true }
    ],
  }

  const defaultSettings: ComposeSettings = {
    tone: 'professional',
    length: 'standard',
    includeCTA: true,
    personalization: 'standard',
  }

  it('generates a contextual email message', async () => {
    const result = await generateContextualMessage(
      mockContext, 'email', defaultSettings, 'user1', 'org1'
    )
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('context')
    expect(result).toHaveProperty('suggestions')
    expect(result).toHaveProperty('tokens')
    expect(result).toHaveProperty('cost')
  })

  it('email result includes subject and body', async () => {
    const result = await generateContextualMessage(
      mockContext, 'email', defaultSettings, 'user1', 'org1'
    )
    expect(result.message.subject).toBeDefined()
    expect(result.message.body).toBeDefined()
  })

  it('context summary includes lead info', async () => {
    const result = await generateContextualMessage(
      mockContext, 'email', defaultSettings, 'user1', 'org1'
    )
    expect(result.context.leadName).toBe('John Doe')
    expect(result.context.leadScore).toBe(75)
    expect(result.context.openRate).toBe(80)
    expect(result.context.responseRate).toBe(60)
  })

  it('returns token and cost from AI service', async () => {
    const result = await generateContextualMessage(
      mockContext, 'email', defaultSettings, 'user1', 'org1'
    )
    expect(result.tokens).toBe(150)
    expect(result.cost).toBe(0.003)
  })

  it('handles sms message type', async () => {
    // SMS mock response has no Subject: line
    const { getOpenAIService } = require('../../src/services/openai.service')
    getOpenAIService().chat.mockResolvedValueOnce({
      response: 'Hi John, checking in on the Downtown listing!',
      tokens: 30,
      cost: 0.001
    })
    const result = await generateContextualMessage(
      mockContext, 'sms', defaultSettings, 'user1', 'org1'
    )
    expect(result.message.body).toBeTruthy()
    expect(result.message.subject).toBeUndefined()
  })

  it('passes draft message for enhancement', async () => {
    const settingsWithDraft: ComposeSettings = {
      ...defaultSettings,
      draftMessage: 'Hey, wanted to follow up on the house',
    }
    const result = await generateContextualMessage(
      mockContext, 'email', settingsWithDraft, 'user1', 'org1'
    )
    expect(result).toBeDefined()
  })
})
