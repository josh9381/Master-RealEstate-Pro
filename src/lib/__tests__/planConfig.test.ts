import { PLANS } from '../planConfig'
import type { PlanDisplay } from '../planConfig'

describe('planConfig', () => {
  it('exports PLANS as a non-empty array', () => {
    expect(Array.isArray(PLANS)).toBe(true)
    expect(PLANS.length).toBeGreaterThan(0)
  })

  it('every plan has required fields', () => {
    for (const plan of PLANS) {
      expect(plan.id).toBeDefined()
      expect(plan.name).toBeDefined()
      expect(typeof plan.price).toBe('number')
      expect(plan.interval).toBe('month')
      expect(plan.description.length).toBeGreaterThan(0)
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    }
  })

  it('includes expected plan tiers', () => {
    const ids = PLANS.map(p => p.id)
    expect(ids).toContain('STARTER')
    expect(ids).toContain('PROFESSIONAL')
    expect(ids).toContain('ELITE')
    expect(ids).toContain('TEAM')
    expect(ids).toContain('ENTERPRISE')
  })

  it('STARTER plan is the cheapest paid plan', () => {
    const paidPlans = PLANS.filter(p => p.price > 0)
    const cheapest = paidPlans.reduce((min, p) => p.price < min.price ? p : min, paidPlans[0])
    expect(cheapest.id).toBe('STARTER')
  })

  it('ENTERPRISE plan has $0 price (custom pricing)', () => {
    const enterprise = PLANS.find(p => p.id === 'ENTERPRISE')
    expect(enterprise?.price).toBe(0)
  })

  it('plans are ordered by ascending price', () => {
    // Enterprise is $0 but last, skip it for ordering check
    const paidPlans = PLANS.filter(p => p.price > 0)
    for (let i = 1; i < paidPlans.length; i++) {
      expect(paidPlans[i].price).toBeGreaterThanOrEqual(paidPlans[i - 1].price)
    }
  })
})
