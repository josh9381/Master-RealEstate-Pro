import { getStatusVariant } from '../campaignUtils'

describe('getStatusVariant', () => {
  it('returns success for ACTIVE', () => {
    expect(getStatusVariant('ACTIVE')).toBe('success')
  })

  it('returns default for SENDING', () => {
    expect(getStatusVariant('SENDING')).toBe('default')
  })

  it('returns warning for SCHEDULED', () => {
    expect(getStatusVariant('SCHEDULED')).toBe('warning')
  })

  it('returns secondary for PAUSED', () => {
    expect(getStatusVariant('PAUSED')).toBe('secondary')
  })

  it('returns outline for COMPLETED', () => {
    expect(getStatusVariant('COMPLETED')).toBe('outline')
  })

  it('returns secondary for DRAFT', () => {
    expect(getStatusVariant('DRAFT')).toBe('secondary')
  })

  it('returns destructive for CANCELLED', () => {
    expect(getStatusVariant('CANCELLED')).toBe('destructive')
  })

  it('returns secondary for unknown status', () => {
    expect(getStatusVariant('UNKNOWN')).toBe('secondary')
  })

  it('handles lowercase input', () => {
    expect(getStatusVariant('active')).toBe('success')
  })

  it('handles mixed case input', () => {
    expect(getStatusVariant('Scheduled')).toBe('warning')
  })
})
