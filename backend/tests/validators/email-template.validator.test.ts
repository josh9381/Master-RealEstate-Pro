import { createEmailTemplateSchema, updateEmailTemplateSchema, emailTemplateIdSchema, listEmailTemplatesQuerySchema } from '../../src/validators/email-template.validator'

describe('email-template.validator', () => {
  describe('createEmailTemplateSchema', () => {
    const valid = { name: 'Welcome', subject: 'Welcome!', body: '<h1>Hi</h1>' }

    it('accepts valid template', () => {
      expect(createEmailTemplateSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing name', () => {
      expect(createEmailTemplateSchema.safeParse({ subject: 'X', body: 'Y' }).success).toBe(false)
    })

    it('rejects empty body', () => {
      expect(createEmailTemplateSchema.safeParse({ name: 'X', subject: 'Y', body: '' }).success).toBe(false)
    })

    it('accepts variables', () => {
      expect(createEmailTemplateSchema.safeParse({ ...valid, variables: { name: 'John' } }).success).toBe(true)
    })

    it('defaults isActive to true', () => {
      const res = createEmailTemplateSchema.safeParse(valid)
      if (res.success) expect(res.data.isActive).toBe(true)
    })
  })

  describe('updateEmailTemplateSchema', () => {
    it('accepts partial update', () => {
      expect(updateEmailTemplateSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })
  })

  describe('emailTemplateIdSchema', () => {
    it('accepts CUID', () => {
      expect(emailTemplateIdSchema.safeParse({ id: 'clh1234567890abcdefghijkl' }).success).toBe(true)
    })
  })

  describe('listEmailTemplatesQuerySchema', () => {
    it('applies defaults', () => {
      const res = listEmailTemplatesQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortBy).toBe('createdAt')
      }
    })

    it('rejects limit over 100', () => {
      expect(listEmailTemplatesQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })

    it('accepts all sortBy values', () => {
      ['name', 'createdAt', 'updatedAt', 'usageCount'].forEach((sortBy) => {
        expect(listEmailTemplatesQuerySchema.safeParse({ sortBy }).success).toBe(true)
      })
    })
  })
})
