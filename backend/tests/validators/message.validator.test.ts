import {
  sendEmailSchema,
  sendSMSSchema,
  makeCallSchema,
  messageQuerySchema,
  markAsReadSchema,
  replyToMessageSchema,
  messageIdSchema,
  batchStarSchema,
  batchArchiveSchema,
  batchDeleteSchema,
} from '../../src/validators/message.validator'

describe('message.validator', () => {
  describe('sendEmailSchema', () => {
    it('accepts email with subject and body', () => {
      expect(sendEmailSchema.safeParse({ to: 'a@b.com', subject: 'Hi', body: 'Hello' }).success).toBe(true)
    })

    it('accepts email with templateId', () => {
      expect(sendEmailSchema.safeParse({ to: 'a@b.com', templateId: 'clh1234567890abcdefghijkl' }).success).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(sendEmailSchema.safeParse({ to: 'bad', subject: 'Hi', body: 'Hello' }).success).toBe(false)
    })

    it('accepts cc and bcc', () => {
      expect(sendEmailSchema.safeParse({
        to: 'a@b.com', subject: 'Hi', body: 'Hello',
        cc: ['c@d.com'], bcc: ['e@f.com'],
      }).success).toBe(true)
    })

    it('accepts attachments', () => {
      expect(sendEmailSchema.safeParse({
        to: 'a@b.com', subject: 'Hi', body: 'Hello',
        attachments: [{ filename: 'doc.pdf', content: 'base64', contentType: 'application/pdf' }],
      }).success).toBe(true)
    })
  })

  describe('sendSMSSchema', () => {
    it('accepts valid SMS with body', () => {
      expect(sendSMSSchema.safeParse({ to: '+15551234567', body: 'Hi' }).success).toBe(true)
    })

    it('accepts SMS with templateId', () => {
      expect(sendSMSSchema.safeParse({ to: '+15551234567', templateId: 'clh1234567890abcdefghijkl' }).success).toBe(true)
    })

    it('accepts phone number', () => {
      expect(sendSMSSchema.safeParse({ to: '+15551234567', body: 'Hi' }).success).toBe(true)
    })
  })

  describe('makeCallSchema', () => {
    it('accepts valid call', () => {
      expect(makeCallSchema.safeParse({ to: '+15551234567' }).success).toBe(true)
    })
  })

  describe('messageQuerySchema', () => {
    it('accepts empty query', () => {
      expect(messageQuerySchema.safeParse({}).success).toBe(true)
    })

    it('applies defaults', () => {
      const res = messageQuerySchema.safeParse({})
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortOrder).toBe('desc')
      }
    })

    it('accepts all type values', () => {
      ['EMAIL', 'SMS', 'CALL', 'SOCIAL', 'NEWSLETTER'].forEach((type) => {
        expect(messageQuerySchema.safeParse({ type }).success).toBe(true)
      })
    })

    it('accepts folder', () => {
      ['inbox', 'archived', 'trash'].forEach((folder) => {
        expect(messageQuerySchema.safeParse({ folder }).success).toBe(true)
      })
    })
  })

  describe('markAsReadSchema', () => {
    it('accepts array of messageIds', () => {
      expect(markAsReadSchema.safeParse({ messageIds: ['a', 'b'] }).success).toBe(true)
    })

    it('rejects empty array', () => {
      expect(markAsReadSchema.safeParse({ messageIds: [] }).success).toBe(false)
    })
  })

  describe('replyToMessageSchema', () => {
    it('accepts valid reply', () => {
      expect(replyToMessageSchema.safeParse({ body: 'Thanks!' }).success).toBe(true)
    })

    it('rejects empty body', () => {
      expect(replyToMessageSchema.safeParse({ body: '' }).success).toBe(false)
    })
  })

  describe('messageIdSchema', () => {
    it('accepts CUID', () => {
      expect(messageIdSchema.safeParse({ id: 'clh1234567890abcdefghijkl' }).success).toBe(true)
    })
  })

  describe('batchStarSchema', () => {
    it('accepts valid batch', () => {
      expect(batchStarSchema.safeParse({ messageIds: ['a'], starred: true }).success).toBe(true)
    })

    it('rejects over 500 items', () => {
      const ids = Array(501).fill('x')
      expect(batchStarSchema.safeParse({ messageIds: ids, starred: true }).success).toBe(false)
    })
  })

  describe('batchArchiveSchema', () => {
    it('accepts valid batch', () => {
      expect(batchArchiveSchema.safeParse({ messageIds: ['a'], archived: true }).success).toBe(true)
    })
  })

  describe('batchDeleteSchema', () => {
    it('accepts valid batch', () => {
      expect(batchDeleteSchema.safeParse({ messageIds: ['a'] }).success).toBe(true)
    })
  })
})
