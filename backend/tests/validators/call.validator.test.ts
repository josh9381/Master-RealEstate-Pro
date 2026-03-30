import { logCallSchema, updateCallSchema, callIdSchema, listCallsQuerySchema } from '../../src/validators/call.validator'

describe('call.validator', () => {
  describe('logCallSchema', () => {
    const valid = { leadId: 'abc', phoneNumber: '+15551234567', outcome: 'ANSWERED' }

    it('accepts valid call', () => {
      expect(logCallSchema.safeParse(valid).success).toBe(true)
    })

    it('accepts phone number string', () => {
      expect(logCallSchema.safeParse({ ...valid, phoneNumber: '+15551234567' }).success).toBe(true)
    })

    it('accepts all outcomes', () => {
      const outcomes = ['ANSWERED', 'VOICEMAIL', 'LEFT_MESSAGE', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALLBACK_SCHEDULED', 'NOT_INTERESTED', 'DNC_REQUEST']
      outcomes.forEach((outcome) => {
        expect(logCallSchema.safeParse({ ...valid, outcome }).success).toBe(true)
      })
    })

    it('rejects duration over 86400', () => {
      expect(logCallSchema.safeParse({ ...valid, duration: 86401 }).success).toBe(false)
    })

    it('accepts notes up to 5000 chars', () => {
      expect(logCallSchema.safeParse({ ...valid, notes: 'x'.repeat(5000) }).success).toBe(true)
    })
  })

  describe('updateCallSchema', () => {
    it('accepts partial update', () => {
      expect(updateCallSchema.safeParse({ notes: 'Updated' }).success).toBe(true)
    })

    it('accepts followUpDate as null', () => {
      expect(updateCallSchema.safeParse({ followUpDate: null }).success).toBe(true)
    })
  })

  describe('callIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(callIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })

    it('rejects empty id', () => {
      expect(callIdSchema.safeParse({ id: '' }).success).toBe(false)
    })
  })

  describe('listCallsQuerySchema', () => {
    it('applies defaults', () => {
      const res = listCallsQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.limit).toBe(50)
        expect(res.data.offset).toBe(0)
        expect(res.data.sortBy).toBe('createdAt')
        expect(res.data.sortOrder).toBe('desc')
      }
    })

    it('accepts direction filter', () => {
      expect(listCallsQuerySchema.safeParse({ direction: 'INBOUND' }).success).toBe(true)
    })

    it('rejects limit over 100', () => {
      expect(listCallsQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })
  })
})
