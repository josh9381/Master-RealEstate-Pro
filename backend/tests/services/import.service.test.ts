import { MAPPABLE_FIELDS } from '../../src/services/import.service'

describe('import.service', () => {
  describe('MAPPABLE_FIELDS', () => {
    it('exports an array of field definitions', () => {
      expect(Array.isArray(MAPPABLE_FIELDS)).toBe(true)
      expect(MAPPABLE_FIELDS.length).toBe(18)
    })

    it('includes required fields (firstName, lastName, email)', () => {
      const required = MAPPABLE_FIELDS.filter(f => f.required)
      const requiredKeys = required.map(f => f.key)
      expect(requiredKeys).toContain('firstName')
      expect(requiredKeys).toContain('lastName')
      expect(requiredKeys).toContain('email')
    })

    it('includes real-estate specific fields', () => {
      const keys = MAPPABLE_FIELDS.map(f => f.key)
      expect(keys).toContain('propertyType')
      expect(keys).toContain('budgetMin')
      expect(keys).toContain('budgetMax')
      expect(keys).toContain('preApprovalStatus')
      expect(keys).toContain('moveInTimeline')
      expect(keys).toContain('desiredLocation')
    })

    it('each field has key, label, and required flag', () => {
      for (const field of MAPPABLE_FIELDS) {
        expect(typeof field.key).toBe('string')
        expect(typeof field.label).toBe('string')
        expect(typeof field.required).toBe('boolean')
      }
    })
  })
})
