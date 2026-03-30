import { createSegmentSchema, updateSegmentSchema, segmentIdParamSchema } from '../../src/validators/segmentation.validator'
import { updateScoringConfigSchema } from '../../src/validators/scoring-config.validator'
import { createTagSchema, updateTagSchema, tagIdSchema, addTagsToLeadSchema } from '../../src/validators/tag.validator'

describe('segmentation.validator', () => {
  describe('createSegmentSchema', () => {
    it('accepts valid segment', () => {
      expect(createSegmentSchema.safeParse({ name: 'Hot Leads' }).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(createSegmentSchema.safeParse({ name: '' }).success).toBe(false)
    })

    it('accepts matchType', () => {
      expect(createSegmentSchema.safeParse({ name: 'X', matchType: 'ALL' }).success).toBe(true)
      expect(createSegmentSchema.safeParse({ name: 'X', matchType: 'ANY' }).success).toBe(true)
    })

    it('rejects invalid matchType', () => {
      expect(createSegmentSchema.safeParse({ name: 'X', matchType: 'NONE' }).success).toBe(false)
    })
  })

  describe('updateSegmentSchema', () => {
    it('accepts partial update', () => {
      expect(updateSegmentSchema.safeParse({ description: 'Updated' }).success).toBe(true)
    })
  })

  describe('segmentIdParamSchema', () => {
    it('accepts non-empty id', () => {
      expect(segmentIdParamSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })
})

describe('scoring-config.validator', () => {
  describe('updateScoringConfigSchema', () => {
    it('accepts valid weights', () => {
      const res = updateScoringConfigSchema.safeParse({
        body: { weights: { engagement: 50, demographic: 30 } },
      })
      expect(res.success).toBe(true)
    })

    it('accepts scoring weights', () => {
      const res = updateScoringConfigSchema.safeParse({
        body: { emailOpenWeight: 10, emailClickWeight: 20 },
      })
      expect(res.success).toBe(true)
    })

    it('rejects weight over 100', () => {
      expect(updateScoringConfigSchema.safeParse({
        body: { emailOpenWeight: 101 },
      }).success).toBe(false)
    })

    it('accepts negative emailOptOutPenalty', () => {
      expect(updateScoringConfigSchema.safeParse({
        body: { emailOptOutPenalty: -50 },
      }).success).toBe(true)
    })

    it('rejects positive emailOptOutPenalty', () => {
      expect(updateScoringConfigSchema.safeParse({
        body: { emailOptOutPenalty: 10 },
      }).success).toBe(false)
    })
  })
})

describe('tag.validator', () => {
  describe('createTagSchema', () => {
    it('accepts valid tag', () => {
      expect(createTagSchema.safeParse({ name: 'VIP' }).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(createTagSchema.safeParse({ name: '' }).success).toBe(false)
    })

    it('accepts hex color', () => {
      expect(createTagSchema.safeParse({ name: 'VIP', color: '#FF5733' }).success).toBe(true)
    })

    it('rejects invalid color format', () => {
      expect(createTagSchema.safeParse({ name: 'VIP', color: 'red' }).success).toBe(false)
    })
  })

  describe('updateTagSchema', () => {
    it('accepts partial update', () => {
      expect(updateTagSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })

    it('accepts null color', () => {
      expect(updateTagSchema.safeParse({ color: null }).success).toBe(true)
    })
  })

  describe('tagIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(tagIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })

  describe('addTagsToLeadSchema', () => {
    it('accepts non-empty tagIds', () => {
      expect(addTagsToLeadSchema.safeParse({ tagIds: ['a', 'b'] }).success).toBe(true)
    })

    it('rejects empty tagIds', () => {
      expect(addTagsToLeadSchema.safeParse({ tagIds: [] }).success).toBe(false)
    })
  })
})
