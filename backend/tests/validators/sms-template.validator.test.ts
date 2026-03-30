import { createSMSTemplateSchema, updateSMSTemplateSchema, smsTemplateIdSchema, listSMSTemplatesQuerySchema } from '../../src/validators/sms-template.validator'

describe('sms-template.validator', () => {
  describe('createSMSTemplateSchema', () => {
    const valid = { name: 'Follow up', body: 'Hi {{name}}, just checking in!' }

    it('accepts valid template', () => {
      expect(createSMSTemplateSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects empty body', () => {
      expect(createSMSTemplateSchema.safeParse({ name: 'X', body: '' }).success).toBe(false)
    })

    it('rejects body over 1600 chars', () => {
      expect(createSMSTemplateSchema.safeParse({ name: 'X', body: 'x'.repeat(1601) }).success).toBe(false)
    })

    it('defaults isActive to true', () => {
      const res = createSMSTemplateSchema.safeParse(valid)
      if (res.success) expect(res.data.isActive).toBe(true)
    })
  })

  describe('updateSMSTemplateSchema', () => {
    it('accepts partial update', () => {
      expect(updateSMSTemplateSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })
  })

  describe('smsTemplateIdSchema', () => {
    it('accepts CUID', () => {
      expect(smsTemplateIdSchema.safeParse({ id: 'clh1234567890abcdefghijkl' }).success).toBe(true)
    })
  })

  describe('listSMSTemplatesQuerySchema', () => {
    it('applies defaults', () => {
      const res = listSMSTemplatesQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortBy).toBe('createdAt')
      }
    })
  })
})
