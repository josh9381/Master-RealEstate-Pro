import { blocksToMjml, EmailBlock, HeadingData, TextData, ButtonData, DividerData, SpacerData, ImageData, SocialData } from '../../src/utils/emailBlocksShared'

describe('emailBlocksShared', () => {
  describe('blocksToMjml', () => {
    it('generates valid MJML wrapper for empty blocks', () => {
      const result = blocksToMjml([])
      expect(result).toContain('<mjml>')
      expect(result).toContain('</mjml>')
      expect(result).toContain('<mj-body')
      expect(result).toContain('</mj-body>')
    })

    it('uses custom background color', () => {
      const result = blocksToMjml([], { backgroundColor: '#ff0000' })
      expect(result).toContain('background-color="#ff0000"')
    })

    it('converts heading block', () => {
      const blocks: EmailBlock[] = [{
        id: 'h1',
        type: 'heading',
        data: { text: 'Hello World', level: 1, align: 'center', color: '#000' } as HeadingData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('Hello World')
      expect(result).toContain('font-size="28px"')
      expect(result).toContain('font-weight="700"')
      expect(result).toContain('align="center"')
    })

    it('converts h2 heading with correct size', () => {
      const blocks: EmailBlock[] = [{
        id: 'h2',
        type: 'heading',
        data: { text: 'Subtitle', level: 2, align: 'left', color: '#333' } as HeadingData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('font-size="22px"')
      expect(result).toContain('font-weight="600"')
    })

    it('converts text block with HTML escaping for plain text', () => {
      const blocks: EmailBlock[] = [{
        id: 't1',
        type: 'text',
        data: { content: 'Hello world & "friends"', align: 'left', color: '#333', fontSize: 14 } as TextData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;friends&quot;')
    })

    it('preserves raw HTML in text block content when it contains tags', () => {
      const blocks: EmailBlock[] = [{
        id: 't2',
        type: 'text',
        data: { content: '<p>Already HTML</p>', align: 'left', color: '#000', fontSize: 14 } as TextData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<p>Already HTML</p>')
    })

    it('converts button block', () => {
      const blocks: EmailBlock[] = [{
        id: 'b1',
        type: 'button',
        data: {
          text: 'Click Me', href: 'https://example.com',
          backgroundColor: '#007bff', color: '#fff', align: 'center',
          borderRadius: 8, fontSize: 16,
        } as ButtonData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-button')
      expect(result).toContain('Click Me')
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('background-color="#007bff"')
    })

    it('converts image block with href', () => {
      const blocks: EmailBlock[] = [{
        id: 'i1',
        type: 'image',
        data: { src: 'https://img.com/pic.jpg', alt: 'Photo', width: '600px', href: 'https://link.com', align: 'center' } as ImageData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-image')
      expect(result).toContain('src="https://img.com/pic.jpg"')
      expect(result).toContain('href="https://link.com"')
    })

    it('skips image block with no src', () => {
      const blocks: EmailBlock[] = [{
        id: 'i2',
        type: 'image',
        data: { src: '', alt: '', width: '600px', href: '', align: 'center' } as ImageData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).not.toContain('<mj-image')
    })

    it('converts divider block', () => {
      const blocks: EmailBlock[] = [{
        id: 'd1',
        type: 'divider',
        data: { color: '#ccc', width: '100%', borderStyle: 'dashed' } as DividerData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-divider')
      expect(result).toContain('border-style="dashed"')
    })

    it('converts spacer block', () => {
      const blocks: EmailBlock[] = [{
        id: 's1',
        type: 'spacer',
        data: { height: 40 } as SpacerData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-spacer')
      expect(result).toContain('height="40px"')
    })

    it('converts social block with valid networks', () => {
      const blocks: EmailBlock[] = [{
        id: 'soc1',
        type: 'social',
        data: {
          networks: [
            { name: 'Facebook', href: 'https://fb.com/page' },
            { name: 'Twitter', href: 'https://twitter.com/handle' },
            { name: 'Unknown', href: 'https://other.com' },
          ],
          align: 'center',
          iconSize: 32,
        } as SocialData,
      }]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mj-social')
      expect(result).toContain('name="facebook"')
      expect(result).toContain('name="twitter"')
      expect(result).toContain('name="web"') // unknown falls back to web
    })

    it('handles multiple blocks in sequence', () => {
      const blocks: EmailBlock[] = [
        { id: '1', type: 'heading', data: { text: 'Title', level: 1, align: 'center', color: '#000' } },
        { id: '2', type: 'text', data: { content: 'Body text', align: 'left', color: '#333', fontSize: 14 } },
        { id: '3', type: 'button', data: { text: 'CTA', href: '#', backgroundColor: '#00f', color: '#fff', align: 'center', borderRadius: 4, fontSize: 14 } },
      ]
      const result = blocksToMjml(blocks)
      expect(result).toContain('Title')
      expect(result).toContain('Body text')
      expect(result).toContain('CTA')
    })

    it('ignores unknown block types', () => {
      const blocks: EmailBlock[] = [
        { id: 'u1', type: 'video' as any, data: {} },
      ]
      const result = blocksToMjml(blocks)
      expect(result).toContain('<mjml>')
      // no section generated for unknown type
    })
  })
})
