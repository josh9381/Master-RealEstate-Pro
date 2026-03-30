import { predictResponseRate, generatePredictionReasoning } from '../../src/services/prediction.service'
import type { MessageContext } from '../../src/services/message-context.service'

function makeContext(overrides: Partial<MessageContext> = {}): MessageContext {
  return {
    lead: {
      id: 'lead-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      score: 70,
      status: 'QUALIFIED',
      interests: ['downtown condos', 'investment properties'],
      budget: 500000,
      location: 'Miami',
    },
    engagement: {
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      totalMessages: 10,
      openRate: 80,
      responseRate: 60,
      avgResponseTime: 120,
    },
    conversation: {
      id: 'conv-1',
      messageCount: 5,
      recentMessages: [],
    },
    properties: [
      { id: 'p1', address: '123 Main St', price: 450000, type: 'Condo', viewed: true },
    ],
    ...overrides,
  }
}

describe('prediction.service', () => {
  describe('predictResponseRate', () => {
    it('returns a number between 0 and 100', async () => {
      const ctx = makeContext()
      const words = Array(80).fill('word').join(' ') + '?'
      const score = await predictResponseRate(words, ctx)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('gives higher score to messages with questions', async () => {
      const ctx = makeContext()
      const noQuestion = Array(80).fill('word').join(' ')
      const withQuestion = noQuestion + ' Would you like to schedule a tour?'
      const scoreNoQ = await predictResponseRate(noQuestion, ctx)
      const scoreQ = await predictResponseRate(withQuestion, ctx)
      expect(scoreQ).toBeGreaterThanOrEqual(scoreNoQ)
    })

    it('gives higher score to messages with CTA', async () => {
      const ctx = makeContext()
      const noCta = Array(80).fill('information').join(' ')
      const withCta = Array(80).fill('information').join(' ') + ' Please schedule a meeting.'
      const scoreNo = await predictResponseRate(noCta, ctx)
      const scoreCta = await predictResponseRate(withCta, ctx)
      expect(scoreCta).toBeGreaterThanOrEqual(scoreNo)
    })

    it('gives higher score for personalized messages', async () => {
      const ctx = makeContext()
      const generic = Array(80).fill('word').join(' ')
      const personalized = `Hi John Doe, I found a great condo in Miami near 123 Main St. ` + Array(60).fill('word').join(' ')
      const scoreGeneric = await predictResponseRate(generic, ctx)
      const scorePersonal = await predictResponseRate(personalized, ctx)
      expect(scorePersonal).toBeGreaterThanOrEqual(scoreGeneric)
    })

    it('penalizes very short messages', async () => {
      const ctx = makeContext()
      const short = 'Hi there.'
      const optimal = Array(80).fill('word').join(' ')
      const scoreShort = await predictResponseRate(short, ctx)
      const scoreOptimal = await predictResponseRate(optimal, ctx)
      expect(scoreOptimal).toBeGreaterThan(scoreShort)
    })

    it('penalizes stale leads', async () => {
      const fresh = makeContext({
        engagement: {
          lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          totalMessages: 10, openRate: 80, responseRate: 60, avgResponseTime: 120,
        },
      })
      const stale = makeContext({
        engagement: {
          lastContact: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          totalMessages: 10, openRate: 80, responseRate: 60, avgResponseTime: 120,
        },
      })
      const msg = Array(80).fill('word').join(' ')
      const scoreFresh = await predictResponseRate(msg, fresh)
      const scoreStale = await predictResponseRate(msg, stale)
      expect(scoreFresh).toBeGreaterThan(scoreStale)
    })
  })

  describe('generatePredictionReasoning', () => {
    it('returns a string with reasoning', () => {
      const ctx = makeContext()
      const msg = Array(80).fill('word').join(' ') + '?'
      const reasoning = generatePredictionReasoning(75, msg, ctx)
      expect(typeof reasoning).toBe('string')
      expect(reasoning.length).toBeGreaterThan(0)
    })

    it('mentions hot lead for high score leads', () => {
      const ctx = makeContext({ lead: { ...makeContext().lead, score: 90 } })
      const msg = Array(80).fill('word').join(' ')
      const reasoning = generatePredictionReasoning(80, msg, ctx)
      expect(reasoning.toLowerCase()).toMatch(/hot lead/i)
    })

    it('mentions low lead score for low scoring leads', () => {
      const ctx = makeContext({ lead: { ...makeContext().lead, score: 20 } })
      const msg = Array(80).fill('word').join(' ')
      const reasoning = generatePredictionReasoning(30, msg, ctx)
      expect(reasoning.toLowerCase()).toMatch(/low.*score/i)
    })
  })
})
