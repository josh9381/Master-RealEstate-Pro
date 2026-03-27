import { TemplateService } from '../../src/services/template.service'

// Mock prisma (template.service imports it)
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {},
  prisma: {},
}))

jest.mock('../../src/middleware/errorHandler', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
}))

describe('TemplateService.renderTemplate', () => {
  let service: TemplateService

  beforeEach(() => {
    service = new TemplateService()
  })

  it('replaces a simple variable', () => {
    const result = service.renderTemplate('Hello {{lead.firstName}}!', {
      lead: { firstName: 'Alice' },
    })
    expect(result).toBe('Hello Alice!')
  })

  it('replaces multiple variables', () => {
    const result = service.renderTemplate(
      'Hi {{lead.firstName}} {{lead.lastName}}, your email is {{lead.email}}.',
      { lead: { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' } }
    )
    expect(result).toBe('Hi Bob Smith, your email is bob@example.com.')
  })

  it('keeps placeholder when variable not found in context', () => {
    const result = service.renderTemplate('Hello {{lead.missingVar}}!', {})
    expect(result).toBe('Hello {{lead.missingVar}}!')
  })

  it('returns empty string for empty template', () => {
    const result = service.renderTemplate('', {})
    expect(result).toBe('')
  })

  it('handles numeric variable values', () => {
    const result = service.renderTemplate('Score: {{lead.score}}', {
      lead: { score: 95 },
    })
    expect(result).toBe('Score: 95')
  })

  it('handles system variables', () => {
    const result = service.renderTemplate('Year: {{system.currentYear}}', {
      system: { currentYear: 2025 },
    })
    expect(result).toBe('Year: 2025')
  })

  it('handles custom variables', () => {
    const result = service.renderTemplate('Promo: {{custom.promoCode}}', {
      custom: { promoCode: 'SAVE20' },
    })
    expect(result).toBe('Promo: SAVE20')
  })

  it('does not modify text with no variables', () => {
    const result = service.renderTemplate('No variables here.', {})
    expect(result).toBe('No variables here.')
  })
})

describe('TemplateService.getAvailableVariables', () => {
  let service: TemplateService

  beforeEach(() => {
    service = new TemplateService()
  })

  it('returns lead variables for "lead" context', () => {
    const vars = service.getAvailableVariables('lead')
    expect(vars['{{lead.name}}']).toBeDefined()
    expect(vars['{{lead.email}}']).toBeDefined()
  })

  it('returns all variables for "all" context', () => {
    const vars = service.getAvailableVariables('all')
    expect(Object.keys(vars).length).toBeGreaterThan(0)
    // Should include lead variables
    expect(vars['{{lead.name}}']).toBeDefined()
  })
})
