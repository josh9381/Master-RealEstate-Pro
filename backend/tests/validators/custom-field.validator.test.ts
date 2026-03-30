import { createCustomFieldSchema, updateCustomFieldSchema, customFieldIdSchema, reorderCustomFieldsSchema } from '../../src/validators/custom-field.validator'

describe('custom-field.validator', () => {
  describe('createCustomFieldSchema', () => {
    const valid = { name: 'Budget', type: 'number' }

    it('accepts valid field', () => {
      const res = createCustomFieldSchema.safeParse(valid)
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.type).toBe('NUMBER') // transforms to uppercase
    })

    it('rejects invalid type', () => {
      expect(createCustomFieldSchema.safeParse({ name: 'X', type: 'invalid' }).success).toBe(false)
    })

    it('accepts all valid types', () => {
      ['text', 'number', 'date', 'dropdown', 'boolean', 'textarea'].forEach((type) => {
        expect(createCustomFieldSchema.safeParse({ name: 'X', type }).success).toBe(true)
      })
    })

    it('validates fieldKey regex', () => {
      expect(createCustomFieldSchema.safeParse({ name: 'X', type: 'text', fieldKey: 'valid_key' }).success).toBe(true)
      expect(createCustomFieldSchema.safeParse({ name: 'X', type: 'text', fieldKey: 'INVALID' }).success).toBe(false)
    })

    it('accepts options array', () => {
      expect(createCustomFieldSchema.safeParse({ name: 'X', type: 'dropdown', options: ['A', 'B'] }).success).toBe(true)
    })
  })

  describe('updateCustomFieldSchema', () => {
    it('accepts partial update', () => {
      expect(updateCustomFieldSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })

    it('accepts nullable fields', () => {
      expect(updateCustomFieldSchema.safeParse({ defaultValue: null, placeholder: null }).success).toBe(true)
    })
  })

  describe('customFieldIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(customFieldIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })

  describe('reorderCustomFieldsSchema', () => {
    it('accepts non-empty array', () => {
      expect(reorderCustomFieldsSchema.safeParse({ fieldIds: ['a', 'b'] }).success).toBe(true)
    })

    it('rejects empty array', () => {
      expect(reorderCustomFieldsSchema.safeParse({ fieldIds: [] }).success).toBe(false)
    })
  })
})
