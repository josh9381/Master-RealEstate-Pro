import {
  createCampaignSchema,
  updateCampaignSchema,
  sendCampaignSchema,
  campaignIdSchema,
  listCampaignsQuerySchema,
  updateCampaignMetricsSchema,
} from '../../src/validators/campaign.validator'

describe('campaign.validator', () => {
  describe('createCampaignSchema', () => {
    const valid = { name: 'Summer Campaign', type: 'EMAIL' }

    it('accepts valid campaign', () => {
      expect(createCampaignSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing name', () => {
      expect(createCampaignSchema.safeParse({ type: 'EMAIL' }).success).toBe(false)
    })

    it('rejects invalid type', () => {
      expect(createCampaignSchema.safeParse({ name: 'X', type: 'INVALID' }).success).toBe(false)
    })

    it('accepts SMS type', () => {
      expect(createCampaignSchema.safeParse({ name: 'X', type: 'SMS' }).success).toBe(true)
    })

    it('accepts PHONE type', () => {
      expect(createCampaignSchema.safeParse({ name: 'X', type: 'PHONE' }).success).toBe(true)
    })

    it('rejects negative budget', () => {
      expect(createCampaignSchema.safeParse({ ...valid, budget: -1 }).success).toBe(false)
    })

    it('validates recurring requires isRecurring', () => {
      const res = createCampaignSchema.safeParse({ ...valid, frequency: 'daily', isRecurring: false })
      expect(res.success).toBe(false)
    })

    it('accepts recurring with isRecurring true', () => {
      const res = createCampaignSchema.safeParse({ ...valid, frequency: 'daily', isRecurring: true })
      expect(res.success).toBe(true)
    })

    it('accepts optional body up to 50000 chars', () => {
      expect(createCampaignSchema.safeParse({ ...valid, body: 'Hello' }).success).toBe(true)
    })
  })

  describe('updateCampaignSchema', () => {
    it('accepts partial update', () => {
      expect(updateCampaignSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })

    it('accepts metrics fields', () => {
      expect(updateCampaignSchema.safeParse({ sent: 100, opened: 50 }).success).toBe(true)
    })

    it('rejects negative sent', () => {
      expect(updateCampaignSchema.safeParse({ sent: -1 }).success).toBe(false)
    })
  })

  describe('sendCampaignSchema', () => {
    it('accepts empty body (strict)', () => {
      expect(sendCampaignSchema.safeParse({}).success).toBe(true)
    })

    it('accepts leadIds', () => {
      expect(sendCampaignSchema.safeParse({ leadIds: ['a', 'b'] }).success).toBe(true)
    })

    it('rejects unknown fields (strict)', () => {
      expect(sendCampaignSchema.safeParse({ unknown: true }).success).toBe(false)
    })
  })

  describe('campaignIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(campaignIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })

    it('rejects empty id', () => {
      expect(campaignIdSchema.safeParse({ id: '' }).success).toBe(false)
    })
  })

  describe('listCampaignsQuerySchema', () => {
    it('applies defaults', () => {
      const res = listCampaignsQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortBy).toBe('createdAt')
        expect(res.data.sortOrder).toBe('desc')
      }
    })

    it('accepts valid sortBy', () => {
      const res = listCampaignsQuerySchema.safeParse({ sortBy: 'name' })
      expect(res.success).toBe(true)
    })
  })

  describe('updateCampaignMetricsSchema', () => {
    it('accepts valid metrics', () => {
      expect(updateCampaignMetricsSchema.safeParse({ sent: 10, delivered: 8, opened: 5 }).success).toBe(true)
    })

    it('rejects negative metrics', () => {
      expect(updateCampaignMetricsSchema.safeParse({ sent: -1 }).success).toBe(false)
    })
  })
})
