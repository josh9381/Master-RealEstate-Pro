/**
 * Email Block Editor — Type definitions and MJML conversion.
 *
 * Blocks are stored as JSON and rendered as React components for instant preview.
 * Server-side MJML compilation is used only when sending or generating final HTML.
 */

// ─── Block Types ────────────────────────────────────────────────

export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social'

export interface EmailBlock {
  id: string
  type: BlockType
  data: HeadingData | TextData | ImageData | ButtonData | DividerData | SpacerData | SocialData
}

export interface HeadingData {
  text: string
  level: 1 | 2 | 3
  align: 'left' | 'center' | 'right'
  color: string
}

export interface TextData {
  content: string // supports basic HTML: <b>, <i>, <a>, <ul>, <ol>, <li>, <br>
  align: 'left' | 'center' | 'right'
  color: string
  fontSize: number // px
}

export interface ImageData {
  src: string
  alt: string
  width: string // e.g. "100%" or "300px"
  href: string
  align: 'left' | 'center' | 'right'
}

export interface ButtonData {
  text: string
  href: string
  backgroundColor: string
  color: string
  align: 'left' | 'center' | 'right'
  borderRadius: number // px
  fontSize: number
}

export interface DividerData {
  color: string
  width: string // percentage e.g. "100%"
  borderStyle: 'solid' | 'dashed' | 'dotted'
}

export interface SpacerData {
  height: number // px
}

export interface SocialData {
  networks: { name: string; href: string }[]
  align: 'left' | 'center' | 'right'
  iconSize: number // px
}

// ─── Defaults ───────────────────────────────────────────────────

let idCounter = 0
export function generateBlockId(): string {
  return `block-${Date.now()}-${++idCounter}`
}

export function createDefaultBlock(type: BlockType): EmailBlock {
  const id = generateBlockId()
  switch (type) {
    case 'heading':
      return { id, type, data: { text: 'Your Heading', level: 1, align: 'center', color: '#1a1a1a' } as HeadingData }
    case 'text':
      return { id, type, data: { content: 'Enter your text here...', align: 'left', color: '#333333', fontSize: 16 } as TextData }
    case 'image':
      return { id, type, data: { src: '', alt: 'Image', width: '100%', href: '', align: 'center' } as ImageData }
    case 'button':
      return { id, type, data: { text: 'Click Here', href: '#', backgroundColor: '#2563eb', color: '#ffffff', align: 'center', borderRadius: 6, fontSize: 16 } as ButtonData }
    case 'divider':
      return { id, type, data: { color: '#e5e7eb', width: '100%', borderStyle: 'solid' } as DividerData }
    case 'spacer':
      return { id, type, data: { height: 24 } as SpacerData }
    case 'social':
      return { id, type, data: { networks: [{ name: 'Facebook', href: '#' }, { name: 'Instagram', href: '#' }], align: 'center', iconSize: 32 } as SocialData }
    default:
      return { id, type: 'text', data: { content: '', align: 'left', color: '#333333', fontSize: 16 } as TextData }
  }
}

// ─── Template variables ─────────────────────────────────────────

export const TEMPLATE_VARIABLES = [
  { label: 'First Name', value: '{{lead.firstName}}' },
  { label: 'Last Name', value: '{{lead.lastName}}' },
  { label: 'Full Name', value: '{{lead.name}}' },
  { label: 'Email', value: '{{lead.email}}' },
  { label: 'Phone', value: '{{lead.phone}}' },
  { label: 'Company', value: '{{lead.company}}' },
  { label: 'Property Type', value: '{{lead.propertyType}}' },
  { label: 'Budget', value: '{{lead.budgetMax}}' },
  { label: 'Location', value: '{{lead.desiredLocation}}' },
  { label: 'Agent Name', value: '{{agent.name}}' },
  { label: 'Agent Email', value: '{{agent.email}}' },
  { label: 'Agent Phone', value: '{{agent.phone}}' },
  { label: 'Company Name', value: '{{company.name}}' },
  { label: 'Company Address', value: '{{company.address}}' },
  { label: 'Unsubscribe URL', value: '{{unsubscribeUrl}}' },
]

// ─── Block Palette ──────────────────────────────────────────────

export const BLOCK_PALETTE: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: 'heading', label: 'Heading', icon: 'Type', description: 'Title or section heading' },
  { type: 'text', label: 'Text', icon: 'AlignLeft', description: 'Paragraph with formatting' },
  { type: 'image', label: 'Image', icon: 'Image', description: 'Photo or graphic' },
  { type: 'button', label: 'Button', icon: 'MousePointerClick', description: 'Call-to-action button' },
  { type: 'divider', label: 'Divider', icon: 'Minus', description: 'Horizontal line separator' },
  { type: 'spacer', label: 'Spacer', icon: 'Space', description: 'Vertical spacing' },
  { type: 'social', label: 'Social Links', icon: 'Share2', description: 'Social media icons' },
]

// ─── Starter Templates ─────────────────────────────────────────

export const STARTER_TEMPLATES: { name: string; description: string; blocks: EmailBlock[] }[] = [
  {
    name: 'Property Listing',
    description: 'Showcase a new property listing',
    blocks: [
      { id: generateBlockId(), type: 'heading', data: { text: 'New Property Just Listed! 🏠', level: 1, align: 'center', color: '#1a1a1a' } },
      { id: generateBlockId(), type: 'image', data: { src: '', alt: 'Property Photo', width: '100%', href: '', align: 'center' } },
      { id: generateBlockId(), type: 'heading', data: { text: '123 Main Street, Anytown', level: 2, align: 'left', color: '#2563eb' } },
      { id: generateBlockId(), type: 'text', data: { content: 'Hi {{lead.firstName}},\n\nI wanted to share an exciting new listing that matches your search criteria. This beautiful home features...', align: 'left', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'button', data: { text: 'View Full Listing', href: '#', backgroundColor: '#2563eb', color: '#ffffff', align: 'center', borderRadius: 6, fontSize: 16 } },
      { id: generateBlockId(), type: 'divider', data: { color: '#e5e7eb', width: '100%', borderStyle: 'solid' } },
      { id: generateBlockId(), type: 'text', data: { content: 'Best regards,\n{{agent.name}}\n{{agent.phone}}', align: 'left', color: '#666666', fontSize: 14 } },
    ],
  },
  {
    name: 'Open House Invite',
    description: 'Invite leads to an open house',
    blocks: [
      { id: generateBlockId(), type: 'heading', data: { text: "You're Invited! 🎉", level: 1, align: 'center', color: '#1a1a1a' } },
      { id: generateBlockId(), type: 'text', data: { content: 'Hi {{lead.firstName}},\n\nJoin us this weekend for an exclusive open house event!', align: 'center', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'spacer', data: { height: 16 } },
      { id: generateBlockId(), type: 'heading', data: { text: 'Saturday, 1:00 PM – 4:00 PM', level: 2, align: 'center', color: '#2563eb' } },
      { id: generateBlockId(), type: 'image', data: { src: '', alt: 'Property Photo', width: '100%', href: '', align: 'center' } },
      { id: generateBlockId(), type: 'text', data: { content: 'Tour this stunning home, meet the agent, and explore the neighborhood. Refreshments provided!', align: 'center', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'button', data: { text: 'RSVP Now', href: '#', backgroundColor: '#16a34a', color: '#ffffff', align: 'center', borderRadius: 8, fontSize: 18 } },
      { id: generateBlockId(), type: 'divider', data: { color: '#e5e7eb', width: '100%', borderStyle: 'solid' } },
      { id: generateBlockId(), type: 'text', data: { content: '{{agent.name}} | {{company.name}}\n{{agent.email}} | {{agent.phone}}', align: 'center', color: '#999999', fontSize: 13 } },
    ],
  },
  {
    name: 'Market Update',
    description: 'Monthly market stats and news',
    blocks: [
      { id: generateBlockId(), type: 'heading', data: { text: 'Market Update — {{company.name}}', level: 1, align: 'center', color: '#1a1a1a' } },
      { id: generateBlockId(), type: 'divider', data: { color: '#2563eb', width: '40%', borderStyle: 'solid' } },
      { id: generateBlockId(), type: 'text', data: { content: 'Hi {{lead.firstName}},\n\nHere\'s your monthly real estate market snapshot:', align: 'left', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'text', data: { content: '<b>📊 Key Stats This Month:</b>\n• Median home price: $XXX,XXX\n• Average days on market: XX\n• New listings: XXX\n• Homes sold: XXX', align: 'left', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'text', data: { content: 'The market continues to show strong activity in your area. If you\'re thinking about buying or selling, now is a great time to connect.', align: 'left', color: '#333333', fontSize: 16 } },
      { id: generateBlockId(), type: 'button', data: { text: 'Schedule a Free Consultation', href: '#', backgroundColor: '#2563eb', color: '#ffffff', align: 'center', borderRadius: 6, fontSize: 16 } },
      { id: generateBlockId(), type: 'spacer', data: { height: 24 } },
      { id: generateBlockId(), type: 'social', data: { networks: [{ name: 'Facebook', href: '#' }, { name: 'Instagram', href: '#' }, { name: 'LinkedIn', href: '#' }], align: 'center', iconSize: 32 } },
    ],
  },
  {
    name: 'Blank Email',
    description: 'Start from scratch',
    blocks: [
      { id: generateBlockId(), type: 'text', data: { content: 'Start writing your email...', align: 'left', color: '#333333', fontSize: 16 } },
    ],
  },
]

// ─── Serialization ──────────────────────────────────────────────

/**
 * Serialize blocks to a JSON string for storage.
 */
export function serializeBlocks(blocks: EmailBlock[]): string {
  return JSON.stringify({ __emailBlocks: true, version: 1, blocks })
}

/**
 * Try to deserialize blocks from a content string.
 * Returns null if the content is plain text (legacy).
 */
export function deserializeBlocks(content: string): EmailBlock[] | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed && parsed.__emailBlocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
    }
  } catch {
    // Not JSON — legacy plain text content
  }
  return null
}

// ─── MJML Conversion (used on backend) ─────────────────────────

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

/**
 * Convert blocks array to MJML markup string.
 * Used server-side with the `mjml` package for final HTML compilation.
 */
export function blocksToMjml(blocks: EmailBlock[], options?: { brandColor?: string; backgroundColor?: string }): string {
  const bgColor = options?.backgroundColor || '#f4f4f5'
  const contentBg = '#ffffff'

  const sections = blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const d = block.data as HeadingData
        const sizes = { 1: '28px', 2: '22px', 3: '18px' }
        const weights = { 1: '700', 2: '600', 3: '600' }
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
          const name = n.name.toLowerCase() as string
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
