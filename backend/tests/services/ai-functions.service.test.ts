import { AI_FUNCTIONS } from '../../src/services/ai-functions.service'

describe('ai-functions.service', () => {
  describe('AI_FUNCTIONS', () => {
    it('exports an array of function definitions', () => {
      expect(Array.isArray(AI_FUNCTIONS)).toBe(true)
      expect(AI_FUNCTIONS.length).toBeGreaterThan(0)
    })

    it('each function has name, description, and parameters', () => {
      for (const fn of AI_FUNCTIONS) {
        expect(fn.name).toBeDefined()
        expect(typeof fn.name).toBe('string')
        expect(fn.description).toBeDefined()
        expect(fn.parameters).toBeDefined()
        expect(fn.parameters.type).toBe('object')
        expect(fn.parameters.properties).toBeDefined()
      }
    })

    it('includes core CRUD functions', () => {
      const names = AI_FUNCTIONS.map(f => f.name)
      expect(names).toContain('create_lead')
      expect(names).toContain('update_lead')
      expect(names).toContain('delete_lead')
    })

    it('includes lead annotation functions', () => {
      const names = AI_FUNCTIONS.map(f => f.name)
      expect(names).toContain('add_note_to_lead')
      expect(names).toContain('add_tag_to_lead')
    })

    it('includes communication functions', () => {
      const names = AI_FUNCTIONS.map(f => f.name)
      expect(names).toContain('send_email')
      expect(names).toContain('send_sms')
    })

    it('includes activity and task functions', () => {
      const names = AI_FUNCTIONS.map(f => f.name)
      expect(names).toContain('create_activity')
      expect(names).toContain('create_task')
    })

    it('includes search/query functions', () => {
      const names = AI_FUNCTIONS.map(f => f.name)
      expect(names).toContain('search_leads')
      expect(names).toContain('get_lead_count')
    })

    it('create_lead requires firstName, lastName, email', () => {
      const createLead = AI_FUNCTIONS.find(f => f.name === 'create_lead')!
      expect(createLead.parameters.required).toEqual(['firstName', 'lastName', 'email'])
    })

    it('update_lead requires leadId', () => {
      const updateLead = AI_FUNCTIONS.find(f => f.name === 'update_lead')!
      expect(updateLead.parameters.required).toEqual(['leadId'])
    })

    it('delete_lead requires leadId', () => {
      const deleteLead = AI_FUNCTIONS.find(f => f.name === 'delete_lead')!
      expect(deleteLead.parameters.required).toEqual(['leadId'])
    })

    it('create_lead status has valid enum values', () => {
      const createLead = AI_FUNCTIONS.find(f => f.name === 'create_lead')!
      const statusProp = createLead.parameters.properties.status as any
      expect(statusProp.enum).toEqual(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'])
    })
  })
})
