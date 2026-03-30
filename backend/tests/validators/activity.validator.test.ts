import { createActivitySchema, updateActivitySchema, getActivitiesSchema } from '../../src/validators/activity.validator'

describe('activity.validator', () => {
  describe('createActivitySchema', () => {
    const valid = { type: 'EMAIL_SENT', title: 'Sent introduction email' }

    it('accepts valid activity', () => {
      expect(createActivitySchema.safeParse(valid).success).toBe(true)
    })

    it('rejects invalid type', () => {
      expect(createActivitySchema.safeParse({ type: 'INVALID', title: 'X' }).success).toBe(false)
    })

    it('rejects empty title', () => {
      expect(createActivitySchema.safeParse({ type: 'EMAIL_SENT', title: '' }).success).toBe(false)
    })

    it('rejects title over 200 chars', () => {
      expect(createActivitySchema.safeParse({ type: 'EMAIL_SENT', title: 'x'.repeat(201) }).success).toBe(false)
    })

    it('accepts optional metadata', () => {
      expect(createActivitySchema.safeParse({ ...valid, metadata: { key: 'val' } }).success).toBe(true)
    })

    it('accepts all valid types', () => {
      const types = ['EMAIL_SENT', 'EMAIL_OPENED', 'SMS_SENT', 'CALL_MADE', 'NOTE_ADDED', 'STATUS_CHANGED', 'LEAD_CREATED']
      types.forEach((type) => {
        expect(createActivitySchema.safeParse({ type, title: 'T' }).success).toBe(true)
      })
    })
  })

  describe('updateActivitySchema', () => {
    it('accepts partial updates', () => {
      expect(updateActivitySchema.safeParse({ title: 'Updated' }).success).toBe(true)
    })

    it('accepts empty object', () => {
      expect(updateActivitySchema.safeParse({}).success).toBe(true)
    })
  })

  describe('getActivitiesSchema', () => {
    it('accepts empty query', () => {
      expect(getActivitiesSchema.safeParse({}).success).toBe(true)
    })

    it('transforms page string to number', () => {
      const res = getActivitiesSchema.safeParse({ page: '2', limit: '10' })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(2)
        expect(res.data.limit).toBe(10)
      }
    })

    it('rejects non-numeric page', () => {
      expect(getActivitiesSchema.safeParse({ page: 'abc' }).success).toBe(false)
    })
  })
})
