import { calculateNextSendDate } from '../../src/services/campaign-scheduler.service'

jest.mock('../../src/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('../../src/config/database', () => ({ prisma: {} }))
jest.mock('../../src/services/campaign-executor.service', () => ({ executeCampaign: jest.fn() }))
jest.mock('../../src/services/ab-test-evaluator.service', () => ({ processABTestAutoWinners: jest.fn() }))

describe('calculateNextSendDate', () => {
  const baseDate = new Date('2025-01-15T10:00:00.000Z') // Wednesday

  it('returns null for unknown frequency', () => {
    const result = calculateNextSendDate(baseDate, 'hourly', null)
    expect(result).toBeNull()
  })

  it('adds 1 day for daily frequency', () => {
    const result = calculateNextSendDate(baseDate, 'daily', null)!
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(baseDate.getDate() + 1)
  })

  it('sets custom time for daily frequency when time is in pattern', () => {
    const result = calculateNextSendDate(baseDate, 'daily', { time: '09:30' })!
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(30)
  })

  it('advances to next specified weekday for weekly frequency', () => {
    // baseDate is Wednesday = day 3. Next specified day = Friday = 5
    const result = calculateNextSendDate(baseDate, 'weekly', { daysOfWeek: [5] })!
    expect(result).not.toBeNull()
    expect(result.getDay()).toBe(5) // Friday
  })

  it('wraps to next week when no later day exists in daysOfWeek', () => {
    // baseDate is Wednesday = 3. daysOfWeek = [1] (Monday) - wraps to next week Monday
    const result = calculateNextSendDate(baseDate, 'weekly', { daysOfWeek: [1] })!
    expect(result).not.toBeNull()
    expect(result.getDay()).toBe(1) // Monday
    // Must be a future date
    expect(result.getTime()).toBeGreaterThan(baseDate.getTime())
  })

  it('defaults to 7 days later for weekly with no daysOfWeek', () => {
    const result = calculateNextSendDate(baseDate, 'weekly', {})!
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(baseDate.getDate() + 7)
  })

  it('advances by 1 month for monthly frequency', () => {
    const result = calculateNextSendDate(baseDate, 'monthly', null)!
    expect(result).not.toBeNull()
    expect(result.getMonth()).toBe((baseDate.getMonth() + 1) % 12)
  })

  it('sets specific dayOfMonth for monthly frequency', () => {
    const result = calculateNextSendDate(baseDate, 'monthly', { dayOfMonth: 10 })!
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(10)
  })
})
