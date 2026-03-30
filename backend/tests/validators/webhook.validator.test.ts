import {
  twilioSmsWebhookSchema,
  twilioStatusWebhookSchema,
  sendgridEventSchema,
  sendgridWebhookSchema,
  sendgridInboundSchema,
} from '../../src/validators/webhook.validator'

describe('webhook.validator', () => {
  describe('twilioSmsWebhookSchema', () => {
    const valid = { MessageSid: 'SM123', From: '+15551234567', To: '+15559876543' }

    it('accepts valid Twilio SMS webhook', () => {
      expect(twilioSmsWebhookSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing MessageSid', () => {
      expect(twilioSmsWebhookSchema.safeParse({ From: '+1', To: '+1' }).success).toBe(false)
    })

    it('defaults Body to empty string', () => {
      const res = twilioSmsWebhookSchema.safeParse(valid)
      if (res.success) expect(res.data.Body).toBe('')
    })

    it('passes through additional Twilio fields', () => {
      const res = twilioSmsWebhookSchema.safeParse({ ...valid, CustomField: 'value' })
      expect(res.success).toBe(true)
      if (res.success) expect((res.data as any).CustomField).toBe('value')
    })
  })

  describe('twilioStatusWebhookSchema', () => {
    it('accepts valid status webhook', () => {
      expect(twilioStatusWebhookSchema.safeParse({
        MessageSid: 'SM123', MessageStatus: 'delivered',
      }).success).toBe(true)
    })

    it('rejects missing MessageStatus', () => {
      expect(twilioStatusWebhookSchema.safeParse({ MessageSid: 'SM123' }).success).toBe(false)
    })
  })

  describe('sendgridEventSchema', () => {
    it('accepts valid event', () => {
      expect(sendgridEventSchema.safeParse({ event: 'delivered' }).success).toBe(true)
    })

    it('rejects missing event', () => {
      expect(sendgridEventSchema.safeParse({}).success).toBe(false)
    })

    it('accepts optional fields', () => {
      expect(sendgridEventSchema.safeParse({
        event: 'open',
        sg_message_id: 'abc',
        email: 'a@b.com',
        timestamp: 1234567890,
      }).success).toBe(true)
    })
  })

  describe('sendgridWebhookSchema', () => {
    it('accepts array of events', () => {
      expect(sendgridWebhookSchema.safeParse([
        { event: 'delivered' },
        { event: 'open' },
      ]).success).toBe(true)
    })

    it('accepts single event', () => {
      expect(sendgridWebhookSchema.safeParse({ event: 'bounce' }).success).toBe(true)
    })
  })

  describe('sendgridInboundSchema', () => {
    it('accepts valid inbound email', () => {
      expect(sendgridInboundSchema.safeParse({
        from: 'a@b.com', to: 'c@d.com', subject: 'Hello',
      }).success).toBe(true)
    })

    it('applies defaults', () => {
      const res = sendgridInboundSchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.from).toBe('')
        expect(res.data.to).toBe('')
        expect(res.data.subject).toBe('(no subject)')
      }
    })
  })
})
