import { cn, formatDate, formatDateTime, formatCurrency, formatNumber, truncate } from '@/lib/utils'

describe('utils', () => {
  describe('cn (class name merger)', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
    })

    it('deduplicates Tailwind classes', () => {
      const result = cn('px-4', 'px-8')
      expect(result).toBe('px-8') // tailwind-merge dedupes
    })

    it('handles undefined and null', () => {
      expect(cn('a', undefined, null, 'b')).toBe('a b')
    })
  })

  describe('formatDate', () => {
    it('formats a date string', () => {
      const result = formatDate('2025-06-15T12:00:00Z')
      expect(result).toContain('Jun')
      expect(result).toContain('15')
      expect(result).toContain('2025')
    })

    it('formats a Date object', () => {
      const result = formatDate(new Date('2025-01-01'))
      expect(result).toContain('2025')
    })
  })

  describe('formatDateTime', () => {
    it('includes time in output', () => {
      const result = formatDateTime('2025-06-15T14:30:00Z')
      expect(result).toContain('Jun')
      expect(result).toContain('15')
      // Should contain time component
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatCurrency', () => {
    it('formats as USD', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('1,234.56')
      expect(result).toContain('$')
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toContain('0.00')
    })

    it('handles large numbers', () => {
      const result = formatCurrency(1000000)
      expect(result).toContain('1,000,000')
    })
  })

  describe('formatNumber', () => {
    it('formats with comma separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('handles small numbers', () => {
      expect(formatNumber(42)).toBe('42')
    })
  })

  describe('truncate', () => {
    it('truncates long strings with ellipsis', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...')
    })

    it('does not truncate short strings', () => {
      expect(truncate('Hi', 10)).toBe('Hi')
    })

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello')
    })
  })
})
