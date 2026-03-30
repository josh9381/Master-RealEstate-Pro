import { createLeadSchema, updateLeadSchema, listLeadsQuerySchema, leadIdSchema, bulkDeleteLeadsSchema, bulkUpdateLeadsSchema, mergeLeadsSchema } from '../../src/validators/lead.validator'

describe('lead.validator', () => {
  describe('createLeadSchema', () => {
    const valid = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }

    it('accepts valid lead', () => {
      expect(createLeadSchema.safeParse(valid).success).toBe(true)
    })

    it('accepts optional real-estate fields', () => {
      const res = createLeadSchema.safeParse({
        ...valid,
        propertyType: 'Condo',
        budgetMin: 100000,
        budgetMax: 500000,
        bedsMin: 2,
        bathsMin: 1,
      })
      expect(res.success).toBe(true)
    })

    it('rejects missing firstName', () => {
      expect(createLeadSchema.safeParse({ lastName: 'D', email: 'a@b.com' }).success).toBe(false)
    })

    it('rejects invalid email', () => {
      expect(createLeadSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false)
    })

    it('rejects negative value', () => {
      expect(createLeadSchema.safeParse({ ...valid, value: -1 }).success).toBe(false)
    })

    it('rejects invalid status enum', () => {
      expect(createLeadSchema.safeParse({ ...valid, status: 'INVALID' }).success).toBe(false)
    })

    it('accepts valid status enum', () => {
      expect(createLeadSchema.safeParse({ ...valid, status: 'QUALIFIED' }).success).toBe(true)
    })
  })

  describe('updateLeadSchema', () => {
    it('accepts partial updates', () => {
      expect(updateLeadSchema.safeParse({ firstName: 'Bob' }).success).toBe(true)
    })

    it('accepts nullable fields', () => {
      expect(updateLeadSchema.safeParse({ phone: null, company: null }).success).toBe(true)
    })

    it('accepts score within range', () => {
      expect(updateLeadSchema.safeParse({ score: 50 }).success).toBe(true)
    })

    it('rejects score over 100', () => {
      expect(updateLeadSchema.safeParse({ score: 101 }).success).toBe(false)
    })
  })

  describe('listLeadsQuerySchema', () => {
    it('applies defaults', () => {
      const res = listLeadsQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortOrder).toBe('desc')
      }
    })

    it('transforms string numbers', () => {
      const res = listLeadsQuerySchema.safeParse({ page: '3', limit: '10' })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(3)
        expect(res.data.limit).toBe(10)
      }
    })

    it('rejects non-numeric page', () => {
      expect(listLeadsQuerySchema.safeParse({ page: 'abc' }).success).toBe(false)
    })
  })

  describe('leadIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(leadIdSchema.safeParse({ id: 'abc123' }).success).toBe(true)
    })

    it('rejects empty id', () => {
      expect(leadIdSchema.safeParse({ id: '' }).success).toBe(false)
    })
  })

  describe('bulkDeleteLeadsSchema', () => {
    it('accepts array of CUIDs', () => {
      const res = bulkDeleteLeadsSchema.safeParse({ leadIds: ['clh1234567890abcdefghijkl'] })
      expect(res.success).toBe(true)
    })

    it('rejects empty array', () => {
      expect(bulkDeleteLeadsSchema.safeParse({ leadIds: [] }).success).toBe(false)
    })
  })

  describe('bulkUpdateLeadsSchema', () => {
    it('accepts valid bulk update', () => {
      const res = bulkUpdateLeadsSchema.safeParse({
        leadIds: ['clh1234567890abcdefghijkl'],
        updates: { status: 'CONTACTED' },
      })
      expect(res.success).toBe(true)
    })
  })

  describe('mergeLeadsSchema', () => {
    it('accepts valid merge', () => {
      const res = mergeLeadsSchema.safeParse({
        primaryLeadId: 'abc',
        secondaryLeadIds: ['def'],
      })
      expect(res.success).toBe(true)
    })

    it('rejects empty secondaryLeadIds', () => {
      expect(mergeLeadsSchema.safeParse({ primaryLeadId: 'abc', secondaryLeadIds: [] }).success).toBe(false)
    })
  })
})
