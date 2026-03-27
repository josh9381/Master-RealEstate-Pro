import { calcRate, calcRateClamped, formatRate, formatCurrency } from '../../src/utils/metricsCalculator'

describe('metricsCalculator', () => {
  describe('calcRate', () => {
    it('calculates percentage correctly', () => {
      expect(calcRate(25, 100)).toBe(25)
      expect(calcRate(1, 3)).toBe(33.3)
    })

    it('returns 0 when denominator is 0', () => {
      expect(calcRate(5, 0)).toBe(0)
    })

    it('returns 0 when denominator is negative', () => {
      expect(calcRate(5, -1)).toBe(0)
    })

    it('respects decimal places', () => {
      expect(calcRate(1, 3, 2)).toBe(33.33)
      expect(calcRate(1, 3, 0)).toBe(33)
    })

    it('caps decimals at MAX_DECIMALS (2)', () => {
      expect(calcRate(1, 3, 5)).toBe(33.33) // capped at 2
    })

    it('handles 100%', () => {
      expect(calcRate(100, 100)).toBe(100)
    })

    it('can exceed 100% (not clamped)', () => {
      expect(calcRate(150, 100)).toBe(150)
    })
  })

  describe('calcRateClamped', () => {
    it('clamps result to max', () => {
      expect(calcRateClamped(150, 100, 100)).toBe(100)
    })

    it('allows values below max', () => {
      expect(calcRateClamped(50, 100, 100)).toBe(50)
    })

    it('uses custom max', () => {
      expect(calcRateClamped(80, 100, 50)).toBe(50)
    })
  })

  describe('formatRate', () => {
    it('formats to 1 decimal by default', () => {
      expect(formatRate(33.333)).toBe('33.3')
    })

    it('formats to specified decimals', () => {
      expect(formatRate(33.333, 2)).toBe('33.33')
    })

    it('adds trailing zero', () => {
      expect(formatRate(50, 1)).toBe('50.0')
    })
  })

  describe('formatCurrency', () => {
    it('formats to 2 decimals by default', () => {
      expect(formatCurrency(4.999)).toBe('5.00')
    })

    it('formats whole numbers', () => {
      expect(formatCurrency(100)).toBe('100.00')
    })
  })
})
