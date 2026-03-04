/**
 * Shared email block types and MJML conversion.
 * Backend copy — must stay in sync with src/lib/emailBlocks.ts
 */

// ─── Block Types ────────────────────────────────────────────────

export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social'

export interface EmailBlock {
  id: string
  type: BlockType
  data: Record<string, any>
}

export interface HeadingData {
  text: string
  level: 1 | 2 | 3
  align: 'left' | 'center' | 'right'
  color: string
}

export interface TextData {
  content: string
  align: 'left' | 'center' | 'right'
  color: string
  fontSize: number
}

export interface ImageData {
  src: string
  alt: string
  width: string
  href: string
  align: 'left' | 'center' | 'right'
}

export interface ButtonData {
  text: string
  href: string
  backgroundColor: string
  color: string
  align: 'left' | 'center' | 'right'
  borderRadius: number
  fontSize: number
}

export interface DividerData {
  color: string
  width: string
  borderStyle: 'solid' | 'dashed' | 'dotted'
}

export interface SpacerData {
  height: number
}

export interface SocialData {
  networks: { name: string; href: string }[]
  align: 'left' | 'center' | 'right'
  iconSize: number
}

// ─── Helpers ────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(text: string): string {
  return text.replace(/\n/g, '<br/>')
}

// ─── MJML Conversion ───────────────────────────────────────────

/**
 * Convert blocks array to MJML markup string.
 */
export function blocksToMjml(blocks: EmailBlock[], options?: { brandColor?: string; backgroundColor?: string }): string {
  const bgColor = options?.backgroundColor || '#f4f4f5'
  const contentBg = '#ffffff'

  const sections = blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const d = block.data as HeadingData
        const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' }
        const weights: Record<number, string> = { 1: '700', 2: '600', 3: '600' }
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    <mj-text align="${d.align}" color="${d.color}" font-size="${sizes[d.level]}" font-weight="${weights[d.level]}" font-family="Arial, Helvetica, sans-serif" padding="16px 0 8px 0">${nl2br(d.text)}</mj-text>
  </mj-column>
</mj-section>`
      }

      case 'text': {
        const d = block.data as TextData
        const content = d.content.includes('<') ? d.content : nl2br(escapeHtml(d.content))
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    <mj-text align="${d.align}" color="${d.color}" font-size="${d.fontSize}px" line-height="1.6" font-family="Arial, Helvetica, sans-serif" padding="8px 0">${content}</mj-text>
  </mj-column>
</mj-section>`
      }

      case 'image': {
        const d = block.data as ImageData
        if (!d.src) return ''
        const imgTag = `<mj-image src="${escapeHtml(d.src)}" alt="${escapeHtml(d.alt)}" width="${d.width}" align="${d.align}" padding="8px 0"${d.href ? ` href="${escapeHtml(d.href)}"` : ''} />`
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    ${imgTag}
  </mj-column>
</mj-section>`
      }

      case 'button': {
        const d = block.data as ButtonData
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    <mj-button align="${d.align}" background-color="${d.backgroundColor}" color="${d.color}" border-radius="${d.borderRadius}px" font-size="${d.fontSize}px" font-family="Arial, Helvetica, sans-serif" href="${escapeHtml(d.href)}" padding="16px 0">${escapeHtml(d.text)}</mj-button>
  </mj-column>
</mj-section>`
      }

      case 'divider': {
        const d = block.data as DividerData
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    <mj-divider border-color="${d.color}" border-width="1px" border-style="${d.borderStyle}" width="${d.width}" padding="8px 0" />
  </mj-column>
</mj-section>`
      }

      case 'spacer': {
        const d = block.data as SpacerData
        return `<mj-section background-color="${contentBg}" padding="0">
  <mj-column>
    <mj-spacer height="${d.height}px" />
  </mj-column>
</mj-section>`
      }

      case 'social': {
        const d = block.data as SocialData
        const elements = d.networks.map(n => {
          const name = n.name.toLowerCase()
          const validNames = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'pinterest', 'github']
          const socialName = validNames.includes(name) ? name : 'web'
          return `<mj-social-element name="${socialName}" href="${escapeHtml(n.href)}" />`
        }).join('\n      ')
        return `<mj-section background-color="${contentBg}" padding="0 24px">
  <mj-column>
    <mj-social align="${d.align}" icon-size="${d.iconSize}px" mode="horizontal" padding="16px 0">
      ${elements}
    </mj-social>
  </mj-column>
</mj-section>`
      }

      default:
        return ''
    }
  }).filter(Boolean).join('\n')

  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, Helvetica, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="${bgColor}">
    ${sections}
  </mj-body>
</mjml>`
}
