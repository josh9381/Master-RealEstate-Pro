jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {},
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { calculateLeadScore } from '../../src/services/leadScoring.service'

function makeFactors(overrides: Partial<Parameters<typeof calculateLeadScore>[0]> = {}) {
  return {
    emailOpens: 0,
    emailClicks: 0,
    emailReplies: 0,
    formSubmissions: 0,
    propertyInquiries: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    daysSinceLastActivity: 999,
    activityFrequency: 0,
    emailOptedOut: false,
    hasEmail: false,
    hasPhone: false,
    hasCompany: false,
    hasDealValue: false,
    dealValueAbove500k: false,
    hasPropertyType: false,
    hasBudget: false,
    hasBedsOrBaths: false,
    hasBeenContacted: false,
    contactedInLast7Days: false,
    contactedInLast30Days: false,
    hasNotes: false,
    activityCount: 0,
    statusProgression: '',
    hasTags: false,
    emailOptIn: false,
    smsOptIn: false,
    ...overrides,
  }
}

describe('calculateLeadScore', () => {
  it('returns 0 for a completely empty lead', () => {
    expect(calculateLeadScore(makeFactors())).toBe(0)
  })

  it('adds profile completeness points', () => {
    const score = calculateLeadScore(makeFactors({
      hasEmail: true,      // +5
      hasPhone: true,      // +5
      hasCompany: true,    // +5
    }))
    expect(score).toBe(15)
  })

  it('adds deal value points', () => {
    const score = calculateLeadScore(makeFactors({
      hasDealValue: true,       // +10
      dealValueAbove500k: true, // +5
    }))
    expect(score).toBe(15)
  })

  it('adds engagement points from email interactions', () => {
    const score = calculateLeadScore(makeFactors({
      emailOpens: 2,  // +10
      emailClicks: 1, // +10
      emailReplies: 1, // +15
    }))
    expect(score).toBe(35)
  })

  it('adds appointment points', () => {
    const score = calculateLeadScore(makeFactors({
      scheduledAppointments: 1, // +30
      completedAppointments: 1, // +40
    }))
    expect(score).toBe(70)
  })

  it('adds recency bonus for recent activity (<=7 days)', () => {
    const score = calculateLeadScore(makeFactors({
      daysSinceLastActivity: 3, // +20
    }))
    expect(score).toBe(20)
  })

  it('adds partial recency bonus for 8-30 days', () => {
    const score = calculateLeadScore(makeFactors({
      daysSinceLastActivity: 15, // +10
    }))
    expect(score).toBe(10)
  })

  it('adds small recency bonus for 31-90 days', () => {
    const score = calculateLeadScore(makeFactors({
      daysSinceLastActivity: 60, // +5
    }))
    expect(score).toBe(5)
  })

  it('gives no recency bonus for >90 days', () => {
    expect(calculateLeadScore(makeFactors({ daysSinceLastActivity: 100 }))).toBe(0)
  })

  it('adds frequency bonus for high engagement', () => {
    const score = calculateLeadScore(makeFactors({
      activityFrequency: 5, // +15
    }))
    expect(score).toBe(15)
  })

  it('adds medium frequency bonus', () => {
    const score = calculateLeadScore(makeFactors({
      activityFrequency: 3, // +10.05 → rounds
    }))
    // 15 * 0.67 = 10.05, rounded to 10
    expect(score).toBe(10)
  })

  it('adds status progression bonus', () => {
    expect(calculateLeadScore(makeFactors({ statusProgression: 'CONTACTED' }))).toBe(5)
    expect(calculateLeadScore(makeFactors({ statusProgression: 'QUALIFIED' }))).toBe(10)
    expect(calculateLeadScore(makeFactors({ statusProgression: 'PROPOSAL' }))).toBe(15)
    expect(calculateLeadScore(makeFactors({ statusProgression: 'NEGOTIATION' }))).toBe(20)
  })

  it('applies email opt-out penalty', () => {
    const score = calculateLeadScore(makeFactors({
      hasEmail: true,  // +5
      hasPhone: true,  // +5
      emailOptedOut: true, // -50 → clamped to 0
    }))
    expect(score).toBe(0)
  })

  it('clamps score to maximum of 100', () => {
    const score = calculateLeadScore(makeFactors({
      hasEmail: true,
      hasPhone: true,
      hasCompany: true,
      hasDealValue: true,
      dealValueAbove500k: true,
      hasPropertyType: true,
      hasBudget: true,
      hasBedsOrBaths: true,
      hasBeenContacted: true,
      contactedInLast7Days: true,
      hasNotes: true,
      activityCount: 15,
      statusProgression: 'NEGOTIATION',
      hasTags: true,
      emailOptIn: true,
      smsOptIn: true,
      emailOpens: 5,
      emailClicks: 3,
      emailReplies: 2,
      formSubmissions: 2,
      propertyInquiries: 2,
      scheduledAppointments: 2,
      completedAppointments: 2,
      daysSinceLastActivity: 1,
      activityFrequency: 10,
    }))
    expect(score).toBe(100)
  })

  it('never returns negative scores', () => {
    const score = calculateLeadScore(makeFactors({ emailOptedOut: true }))
    expect(score).toBe(0)
  })

  it('handles case-insensitive status', () => {
    const score = calculateLeadScore(makeFactors({ statusProgression: 'qualified' }))
    expect(score).toBe(10)
  })

  it('adds activity count bonuses', () => {
    expect(calculateLeadScore(makeFactors({ activityCount: 3 }))).toBe(0)
    expect(calculateLeadScore(makeFactors({ activityCount: 7 }))).toBe(5)
    expect(calculateLeadScore(makeFactors({ activityCount: 12 }))).toBe(10)
  })
})
