import {
  generateBlockId,
  createDefaultBlock,
  serializeBlocks,
  deserializeBlocks,
  blocksToMjml,
  TEMPLATE_VARIABLES,
  BLOCK_PALETTE,
  STARTER_TEMPLATES,
} from '../emailBlocks'
import type { EmailBlock, BlockType } from '../emailBlocks'

describe('emailBlocks', () => {
  describe('generateBlockId', () => {
    it('returns a non-empty string', () => {
      expect(generateBlockId().length).toBeGreaterThan(0)
    })

    it('returns unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateBlockId()))
      expect(ids.size).toBe(20)
    })
  })

  describe('createDefaultBlock', () => {
    const blockTypes: BlockType[] = ['heading', 'text', 'image', 'button', 'divider', 'spacer', 'social']

    it.each(blockTypes)('creates a valid %s block with id and type', (type) => {
      const block = createDefaultBlock(type)
      expect(block.id).toBeDefined()
      expect(block.type).toBe(type)
      expect(block.data).toBeDefined()
    })
  })

  describe('serializeBlocks / deserializeBlocks', () => {
    it('round-trips blocks through JSON', () => {
      const blocks: EmailBlock[] = [
        createDefaultBlock('heading'),
        createDefaultBlock('text'),
      ]
      const serialized = serializeBlocks(blocks)
      expect(typeof serialized).toBe('string')

      const deserialized = deserializeBlocks(serialized)
      expect(deserialized).toHaveLength(2)
      expect(deserialized![0].type).toBe('heading')
      expect(deserialized![1].type).toBe('text')
    })

    it('deserializeBlocks returns null for invalid JSON', () => {
      expect(deserializeBlocks('not json')).toBeNull()
    })

    it('deserializeBlocks returns null for non-array JSON', () => {
      expect(deserializeBlocks('{"key": "value"}')).toBeNull()
    })
  })

  describe('blocksToMjml', () => {
    it('generates valid MJML for empty blocks', () => {
      const result = blocksToMjml([])
      expect(result).toContain('<mjml>')
      expect(result).toContain('</mjml>')
    })

    it('converts heading block', () => {
      const blocks = [createDefaultBlock('heading')]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-text')
    })

    it('converts button block', () => {
      const blocks = [createDefaultBlock('button')]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-button')
    })

    it('accepts custom background color', () => {
      const result = blocksToMjml([], { backgroundColor: '#123456' })
      expect(result).toContain('#123456')
    })
  })

  describe('constants', () => {
    it('TEMPLATE_VARIABLES is a non-empty array with label/value pairs', () => {
      expect(TEMPLATE_VARIABLES.length).toBeGreaterThan(0)
      for (const v of TEMPLATE_VARIABLES) {
        expect(v.label).toBeDefined()
        expect(v.value).toBeDefined()
      }
    })

    it('BLOCK_PALETTE has entries for all block types', () => {
      const types = BLOCK_PALETTE.map(b => b.type)
      expect(types).toContain('heading')
      expect(types).toContain('text')
      expect(types).toContain('button')
    })

    it('STARTER_TEMPLATES is a non-empty array', () => {
      expect(STARTER_TEMPLATES.length).toBeGreaterThan(0)
      for (const t of STARTER_TEMPLATES) {
        expect(t.name).toBeDefined()
        expect(Array.isArray(t.blocks)).toBe(true)
      }
    })
  })
})
