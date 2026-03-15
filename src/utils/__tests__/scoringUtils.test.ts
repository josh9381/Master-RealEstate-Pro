import { describe, it, expect } from 'vitest'
import { getScoreCategory, filterLeadsByScore, sortLeadsByScore } from '@/utils/scoringUtils'

describe('scoringUtils', () => {
  describe('getScoreCategory', () => {
    it('returns HOT for score >= 80', () => {
      expect(getScoreCategory(80)).toBe('HOT')
      expect(getScoreCategory(100)).toBe('HOT')
    })

    it('returns WARM for score >= 50', () => {
      expect(getScoreCategory(50)).toBe('WARM')
      expect(getScoreCategory(79)).toBe('WARM')
    })

    it('returns COOL for score >= 25', () => {
      expect(getScoreCategory(25)).toBe('COOL')
      expect(getScoreCategory(49)).toBe('COOL')
    })

    it('returns COLD for score < 25', () => {
      expect(getScoreCategory(0)).toBe('COLD')
      expect(getScoreCategory(24)).toBe('COLD')
    })
  })

  describe('filterLeadsByScore', () => {
    const leads = [
      { id: 1, score: 90 },
      { id: 2, score: 60 },
      { id: 3, score: 30 },
      { id: 4, score: 10 },
    ]

    it('returns all leads for ALL category', () => {
      expect(filterLeadsByScore(leads, 'ALL')).toHaveLength(4)
    })

    it('filters HOT leads', () => {
      const result = filterLeadsByScore(leads, 'HOT')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('filters COLD leads', () => {
      const result = filterLeadsByScore(leads, 'COLD')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(4)
    })

    it('handles leads with no score', () => {
      const noScoreLeads = [{ id: 1 }, { id: 2, score: 90 }]
      const result = filterLeadsByScore(noScoreLeads, 'COLD')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })
  })

  describe('sortLeadsByScore', () => {
    const leads = [
      { id: 1, score: 30 },
      { id: 2, score: 90 },
      { id: 3, score: 60 },
    ]

    it('sorts descending by default', () => {
      const result = sortLeadsByScore(leads)
      expect(result.map(l => l.id)).toEqual([2, 3, 1])
    })

    it('sorts ascending when specified', () => {
      const result = sortLeadsByScore(leads, 'asc')
      expect(result.map(l => l.id)).toEqual([1, 3, 2])
    })

    it('does not mutate original array', () => {
      const original = [...leads]
      sortLeadsByScore(leads)
      expect(leads).toEqual(original)
    })
  })
})
