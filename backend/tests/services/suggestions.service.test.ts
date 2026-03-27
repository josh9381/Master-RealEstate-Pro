import { generateSmartSuggestions } from '../../src/services/suggestions.service'
import type { MessageContext } from '../../src/services/message-context.service'
import type { ComposeSettings } from '../../src/services/ai-compose.service'

function makeContext(overrides: Partial<MessageContext> = {}): MessageContext {
  return {
    lead: {
      id: 'lead1',
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '555-0000',
      score: 50,
      status: 'WARM',
      interests: [],
      budget: undefined,
      location: undefined,
    },
    engagement: {
      lastContact: new Date(),
      totalMessages: 5,
      openRate: 50,
      responseRate: 40,
      avgResponseTime: 12,
    },
    conversation: {
      id: 'conv1',
      messageCount: 5,
      recentMessages: [],
    },
    properties: [],
    ...overrides,
  }
}

function makeSettings(overrides: Partial<ComposeSettings> = {}): ComposeSettings {
  return {
    tone: 'professional',
    length: 'standard',
    personalization: 'basic',
    includeCTA: false,
    ...overrides,
  } as ComposeSettings
}

describe('generateSmartSuggestions', () => {
  it('returns empty array for well-performing lead with no issues', () => {
    const context = makeContext({
      engagement: { lastContact: new Date(), totalMessages: 5, openRate: 70, responseRate: 75, avgResponseTime: 5 },
    })
    const result = generateSmartSuggestions(context, makeSettings())
    // May have low-priority "responding well" suggestion
    const highPriority = result.filter((s) => s.priority === 'high')
    expect(highPriority).toHaveLength(0)
  })

  it('suggests compelling subject line when open rate < 30%', () => {
    const context = makeContext({ engagement: { lastContact: new Date(), totalMessages: 5, openRate: 20, responseRate: 40, avgResponseTime: 12 } })
    const result = generateSmartSuggestions(context, makeSettings())
    const contentSuggestions = result.filter((s) => s.type === 'content' && s.text.includes('open rate'))
    expect(contentSuggestions.length).toBeGreaterThan(0)
    expect(contentSuggestions[0].priority).toBe('high')
  })

  it('suggests "responding well" when response rate > 70%', () => {
    const context = makeContext({ engagement: { lastContact: new Date(), totalMessages: 5, openRate: 50, responseRate: 80, avgResponseTime: 12 } })
    const result = generateSmartSuggestions(context, makeSettings())
    const toneSuggestions = result.filter((s) => s.type === 'tone' && s.text.includes('responds well'))
    expect(toneSuggestions.length).toBeGreaterThan(0)
    expect(toneSuggestions[0].priority).toBe('low')
  })

  it('suggests tone change when response rate < 20% and totalMessages > 3', () => {
    const context = makeContext({ engagement: { lastContact: new Date(), totalMessages: 5, openRate: 50, responseRate: 10, avgResponseTime: 12 } })
    const result = generateSmartSuggestions(context, makeSettings())
    const toneSuggestions = result.filter((s) => s.type === 'tone' && s.priority === 'high')
    expect(toneSuggestions.length).toBeGreaterThan(0)
  })

  it('suggests direct tone for hot lead (score >= 80) when tone is not direct', () => {
    const context = makeContext({ lead: { ...makeContext().lead, score: 85 } })
    const result = generateSmartSuggestions(context, makeSettings({ tone: 'professional' }))
    const directSuggestion = result.find((s) => s.action?.recommendedTone === 'direct')
    expect(directSuggestion).toBeDefined()
    expect(directSuggestion?.priority).toBe('high')
  })

  it('suggests friendly tone for cold lead (score < 40) when using direct tone', () => {
    const context = makeContext({ lead: { ...makeContext().lead, score: 30 } })
    const result = generateSmartSuggestions(context, makeSettings({ tone: 'direct' }))
    const friendlySuggestion = result.find((s) => s.action?.recommendedTone === 'friendly')
    expect(friendlySuggestion).toBeDefined()
    expect(friendlySuggestion?.priority).toBe('medium')
  })

  it('suggests re-engagement for lead not contacted in > 14 days', () => {
    const oldContactDate = new Date()
    oldContactDate.setDate(oldContactDate.getDate() - 20)
    const context = makeContext({ engagement: { lastContact: oldContactDate, totalMessages: 5, openRate: 50, responseRate: 40, avgResponseTime: 12 } })
    const result = generateSmartSuggestions(context, makeSettings())
    const timingSuggestion = result.find((s) => s.type === 'timing' && s.text.includes('No contact'))
    expect(timingSuggestion).toBeDefined()
    expect(timingSuggestion?.priority).toBe('high')
  })

  it('warns about contacting lead same day', () => {
    const context = makeContext({ engagement: { lastContact: new Date(), totalMessages: 5, openRate: 50, responseRate: 40, avgResponseTime: 12 } })
    const result = generateSmartSuggestions(context, makeSettings())
    const todaySuggestion = result.find((s) => s.text.includes('Already contacted today'))
    expect(todaySuggestion).toBeDefined()
    expect(todaySuggestion?.priority).toBe('medium')
  })

  it('suggests shorter messages for long conversation with detailed setting', () => {
    const context = makeContext({ conversation: { id: 'c', messageCount: 15, recentMessages: [] } })
    const result = generateSmartSuggestions(context, makeSettings({ length: 'detailed' }))
    const shortSuggestion = result.find((s) => s.action?.recommendedLength === 'brief')
    expect(shortSuggestion).toBeDefined()
  })

  it('sorts suggestions high → medium → low', () => {
    const oldContact = new Date()
    oldContact.setDate(oldContact.getDate() - 20)
    const context = makeContext({
      lead: { ...makeContext().lead, score: 85 },
      engagement: { lastContact: oldContact, totalMessages: 10, openRate: 20, responseRate: 10, avgResponseTime: 5 },
    })
    const result = generateSmartSuggestions(context, makeSettings())
    const priorities = result.map((s) => s.priority)
    const order = { high: 0, medium: 1, low: 2 }
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]])
    }
  })

  it('suggests CTA for HOT lead without CTA included', () => {
    const context = makeContext({ lead: { ...makeContext().lead, status: 'HOT' } })
    const result = generateSmartSuggestions(context, makeSettings({ includeCTA: false }))
    const ctaSuggestion = result.find((s) => s.text.includes('call-to-action'))
    expect(ctaSuggestion).toBeDefined()
    expect(ctaSuggestion?.priority).toBe('high')
  })

  it('suggests removing CTA for COLD lead with CTA', () => {
    const context = makeContext({ lead: { ...makeContext().lead, status: 'COLD' } })
    const result = generateSmartSuggestions(context, makeSettings({ includeCTA: true }))
    const coldSuggestion = result.find((s) => s.text.includes('Cold lead') && s.text.includes('value'))
    expect(coldSuggestion).toBeDefined()
    expect(coldSuggestion?.priority).toBe('medium')
  })
})
