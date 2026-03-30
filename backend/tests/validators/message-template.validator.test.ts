import { createMessageTemplateSchema, updateMessageTemplateSchema, messageTemplateIdSchema } from '../../src/validators/message-template.validator'

describe('message-template.validator', () => {
  describe('createMessageTemplateSchema', () => {
    const valid = { name: 'Greeting', content: 'Hello {{name}}!' }

    it('accepts valid template', () => {
      expect(createMessageTemplateSchema.safeParse(valid).success).toBe(true)
    })

    it('defaults tier to PERSONAL', () => {
      const res = createMessageTemplateSchema.safeParse(valid)
      if (res.success) expect(res.data.tier).toBe('PERSONAL')
    })

    it('defaults isQuickReply to false', () => {
      const res = createMessageTemplateSchema.safeParse(valid)
      if (res.success) expect(res.data.isQuickReply).toBe(false)
    })

    it('accepts all tiers', () => {
      ['PERSONAL', 'ORGANIZATION', 'TEAM'].forEach((tier) => {
        expect(createMessageTemplateSchema.safeParse({ ...valid, tier }).success).toBe(true)
      })
    })

    it('rejects content over 10000 chars', () => {
      expect(createMessageTemplateSchema.safeParse({ name: 'X', content: 'x'.repeat(10001) }).success).toBe(false)
    })
  })

  describe('updateMessageTemplateSchema', () => {
    it('accepts partial update', () => {
      expect(updateMessageTemplateSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })

    it('accepts nullable category', () => {
      expect(updateMessageTemplateSchema.safeParse({ category: null }).success).toBe(true)
    })
  })

  describe('messageTemplateIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(messageTemplateIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })
})
