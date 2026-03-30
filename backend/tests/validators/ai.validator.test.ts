import {
  chatWithAISchema,
  enhanceMessageSchema,
  suggestActionsSchema,
  generateEmailSequenceSchema,
  generateSMSSchema,
  generatePropertyDescriptionSchema,
  generateSocialPostsSchema,
  saveMessageAsTemplateSchema,
  idParamSchema,
  chatFeedbackSchema,
} from '../../src/validators/ai.validator'

describe('ai.validator', () => {
  describe('chatWithAISchema', () => {
    it('accepts valid message', () => {
      expect(chatWithAISchema.safeParse({ message: 'Hello AI' }).success).toBe(true)
    })

    it('rejects empty message', () => {
      expect(chatWithAISchema.safeParse({ message: '' }).success).toBe(false)
    })

    it('rejects message over 5000 chars', () => {
      expect(chatWithAISchema.safeParse({ message: 'x'.repeat(5001) }).success).toBe(false)
    })

    it('accepts conversation history', () => {
      const res = chatWithAISchema.safeParse({
        message: 'Hi',
        conversationHistory: [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi there' }],
      })
      expect(res.success).toBe(true)
    })

    it('rejects history over 50 messages', () => {
      const history = Array(51).fill({ role: 'user', content: 'msg' })
      expect(chatWithAISchema.safeParse({ message: 'Hi', conversationHistory: history }).success).toBe(false)
    })

    it('rejects invalid role in history', () => {
      expect(chatWithAISchema.safeParse({
        message: 'Hi',
        conversationHistory: [{ role: 'invalid', content: 'msg' }],
      }).success).toBe(false)
    })
  })

  describe('enhanceMessageSchema', () => {
    it('accepts valid message', () => {
      expect(enhanceMessageSchema.safeParse({ message: 'Improve this' }).success).toBe(true)
    })

    it('rejects empty message', () => {
      expect(enhanceMessageSchema.safeParse({ message: '' }).success).toBe(false)
    })

    it('accepts optional tone', () => {
      expect(enhanceMessageSchema.safeParse({ message: 'Hi', tone: 'professional' }).success).toBe(true)
    })
  })

  describe('suggestActionsSchema', () => {
    it('accepts empty object', () => {
      expect(suggestActionsSchema.safeParse({}).success).toBe(true)
    })

    it('accepts context', () => {
      expect(suggestActionsSchema.safeParse({ context: 'Lead is cold' }).success).toBe(true)
    })
  })

  describe('generateEmailSequenceSchema', () => {
    it('accepts valid input', () => {
      expect(generateEmailSequenceSchema.safeParse({ leadName: 'John' }).success).toBe(true)
    })

    it('rejects empty leadName', () => {
      expect(generateEmailSequenceSchema.safeParse({ leadName: '' }).success).toBe(false)
    })

    it('rejects sequenceLength over 20', () => {
      expect(generateEmailSequenceSchema.safeParse({ leadName: 'J', sequenceLength: 21 }).success).toBe(false)
    })
  })

  describe('generateSMSSchema', () => {
    it('accepts valid input', () => {
      expect(generateSMSSchema.safeParse({ leadName: 'Jane' }).success).toBe(true)
    })
  })

  describe('generatePropertyDescriptionSchema', () => {
    it('accepts valid address', () => {
      expect(generatePropertyDescriptionSchema.safeParse({ address: '123 Main St' }).success).toBe(true)
    })

    it('accepts optional property details', () => {
      const res = generatePropertyDescriptionSchema.safeParse({
        address: '123 Main St',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1500,
        price: 350000,
      })
      expect(res.success).toBe(true)
    })

    it('rejects negative bedrooms', () => {
      expect(generatePropertyDescriptionSchema.safeParse({ address: 'X', bedrooms: -1 }).success).toBe(false)
    })
  })

  describe('generateSocialPostsSchema', () => {
    it('accepts valid topic', () => {
      expect(generateSocialPostsSchema.safeParse({ topic: 'New listing' }).success).toBe(true)
    })
  })

  describe('saveMessageAsTemplateSchema', () => {
    it('accepts valid input', () => {
      expect(saveMessageAsTemplateSchema.safeParse({ message: 'Hello', name: 'Greeting' }).success).toBe(true)
    })

    it('rejects empty message', () => {
      expect(saveMessageAsTemplateSchema.safeParse({ message: '', name: 'X' }).success).toBe(false)
    })
  })

  describe('idParamSchema', () => {
    it('accepts non-empty id', () => {
      expect(idParamSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })

    it('rejects empty id', () => {
      expect(idParamSchema.safeParse({ id: '' }).success).toBe(false)
    })
  })

  describe('chatFeedbackSchema', () => {
    it('accepts positive feedback', () => {
      expect(chatFeedbackSchema.safeParse({ feedback: 'positive' }).success).toBe(true)
    })

    it('accepts negative feedback', () => {
      expect(chatFeedbackSchema.safeParse({ feedback: 'negative' }).success).toBe(true)
    })

    it('rejects invalid feedback', () => {
      expect(chatFeedbackSchema.safeParse({ feedback: 'neutral' }).success).toBe(false)
    })
  })
})
