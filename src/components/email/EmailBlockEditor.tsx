import { logger } from '@/lib/logger'
import DOMPurify from 'dompurify'
import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Type, AlignLeft, ImageIcon, MousePointerClick, Minus, Space, Share2,
  Trash2, GripVertical, ChevronUp, ChevronDown, Plus, Copy, Eye, EyeOff,
  Variable, LayoutTemplate
} from 'lucide-react'
import {
  EmailBlock, BlockType, HeadingData, TextData, ImageData, ButtonData,
  DividerData, SpacerData, SocialData,
  createDefaultBlock, BLOCK_PALETTE, TEMPLATE_VARIABLES, STARTER_TEMPLATES,
  serializeBlocks, deserializeBlocks, generateBlockId
} from '@/lib/emailBlocks'
import { EmailPreviewFrame } from '@/components/email/EmailPreviewFrame'
import { campaignsApi } from '@/lib/api'

// ─── Icon mapper ────────────────────────────────────────────────

const blockIcons: Record<string, React.ElementType> = {
  Type, AlignLeft, Image: ImageIcon, MousePointerClick, Minus, Space, Share2,
}

function getBlockIcon(iconName: string) {
  return blockIcons[iconName] || AlignLeft
}

// ─── Props ──────────────────────────────────────────────────────

interface EmailBlockEditorProps {
  /** Current serialized content (JSON string or legacy plain text) */
  value: string
  /** Called with serialized JSON string on every change */
  onChange: (value: string) => void
  /** Placeholder for empty state */
  placeholder?: string
  /** Minimum height */
  minHeight?: string
  /** Show template picker on empty state */
  showTemplates?: boolean
}

// ─── Main Component ─────────────────────────────────────────────

export function EmailBlockEditor({
  value,
  onChange,
  placeholder = 'Click a block type to start building your email',
  minHeight = '400px',
  showTemplates = true,
}: EmailBlockEditorProps) {
  // Parse blocks from value
  const initialBlocks = deserializeBlocks(value)
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks || [])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(!initialBlocks && showTemplates)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showVariableMenu, setShowVariableMenu] = useState(false)
  const [compiledHtml, setCompiledHtml] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const dragItemRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null

  // Update parent on every change
  const updateBlocks = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks)
    onChange(serializeBlocks(newBlocks))
  }, [onChange])

  // ─── Block operations ───────────────────────────────────────

  const addBlock = useCallback((type: BlockType, index?: number) => {
    const newBlock = createDefaultBlock(type)
    const newBlocks = [...blocks]
    if (index !== undefined) {
      newBlocks.splice(index + 1, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }
    updateBlocks(newBlocks)
    setSelectedBlockId(newBlock.id)
    setShowTemplatePicker(false)
  }, [blocks, updateBlocks])

  const removeBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id)
    updateBlocks(newBlocks)
    if (selectedBlockId === id) setSelectedBlockId(null)
  }, [blocks, selectedBlockId, updateBlocks])

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx === -1) return
    const clone: EmailBlock = { ...blocks[idx], id: generateBlockId(), data: { ...blocks[idx].data } }
    const newBlocks = [...blocks]
    newBlocks.splice(idx + 1, 0, clone)
    updateBlocks(newBlocks)
    setSelectedBlockId(clone.id)
  }, [blocks, updateBlocks])

  const moveBlock = useCallback((id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= blocks.length) return
    const newBlocks = [...blocks]
    ;[newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]]
    updateBlocks(newBlocks)
  }, [blocks, updateBlocks])

  const updateBlockData = useCallback((id: string, data: Partial<EmailBlock['data']>) => {
    const newBlocks = blocks.map(b =>
      b.id === id ? { ...b, data: { ...b.data, ...data } } : b
    )
    updateBlocks(newBlocks)
  }, [blocks, updateBlocks])

  // ─── Drag & Drop ─────────────────────────────────────────────

  const handleDragStart = (idx: number) => {
    dragItemRef.current = idx
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIndex(idx)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    const dragIdx = dragItemRef.current
    if (dragIdx === null || dragIdx === dropIdx) return
    const newBlocks = [...blocks]
    const [removed] = newBlocks.splice(dragIdx, 1)
    newBlocks.splice(dropIdx, 0, removed)
    updateBlocks(newBlocks)
    dragItemRef.current = null
  }

  const handleDragEnd = () => {
    setDragOverIndex(null)
    dragItemRef.current = null
  }

  // ─── Load template ───────────────────────────────────────────

  const loadTemplate = (template: typeof STARTER_TEMPLATES[0]) => {
    // Deep clone blocks with fresh IDs
    const newBlocks = template.blocks.map(b => ({
      ...b,
      id: generateBlockId(),
      data: { ...b.data },
    }))
    updateBlocks(newBlocks)
    setShowTemplatePicker(false)
    setSelectedBlockId(null)
  }

  // ─── Insert variable ─────────────────────────────────────────

  const insertVariable = (variable: string) => {
    if (!selectedBlock) return
    if (selectedBlock.type === 'heading') {
      const d = selectedBlock.data as HeadingData
      updateBlockData(selectedBlock.id, { text: d.text + variable })
    } else if (selectedBlock.type === 'text') {
      const d = selectedBlock.data as TextData
      // If we have a ref to the textarea, insert at cursor; else append
      if (textareaRef.current) {
        const ta = textareaRef.current
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const newContent = d.content.slice(0, start) + variable + d.content.slice(end)
        updateBlockData(selectedBlock.id, { content: newContent })
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + variable.length
          ta.focus()
        })
      } else {
        updateBlockData(selectedBlock.id, { content: d.content + variable })
      }
    } else if (selectedBlock.type === 'button') {
      const d = selectedBlock.data as ButtonData
      updateBlockData(selectedBlock.id, { text: d.text + variable })
    }
    setShowVariableMenu(false)
  }

  // ─── Template Picker ─────────────────────────────────────────

  if (showTemplatePicker && blocks.length === 0) {
    return (
      <div className="border rounded-lg p-6 space-y-4" style={{ minHeight }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Choose a Starting Template</h3>
            <p className="text-sm text-muted-foreground">Pick a template or start from scratch</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTemplatePicker(false)}>
            Start Blank
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map((template, i) => (
            <button
              key={i}
              onClick={() => loadTemplate(template)}
              className="text-left border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {template.blocks.slice(0, 4).map((b, j) => (
                  <Badge key={j} variant="secondary" className="text-[10px] px-1.5 py-0">{b.type}</Badge>
                ))}
                {template.blocks.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{template.blocks.length - 4}</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Preview Mode ─────────────────────────────────────────────

  if (showPreview) {
    return (
      <div className="border rounded-lg" style={{ minHeight }}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Email Preview</span>
            {!compiledHtml && !isCompiling && (
              <span className="text-xs text-muted-foreground">(block preview — click "Final Preview" for actual email rendering)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsCompiling(true)
                try {
                  const result = await campaignsApi.compileEmail(serializeBlocks(blocks))
                  setCompiledHtml(result.html)
                } catch (error) {
                  logger.error('Failed to compile email:', error)
                  setCompiledHtml(null)
                } finally {
                  setIsCompiling(false)
                }
              }}
              disabled={isCompiling || blocks.length === 0}
              className="gap-1 text-xs h-7"
            >
              {isCompiling ? 'Compiling…' : '📧 Final Preview'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowPreview(false); setCompiledHtml(null) }}>
              <EyeOff className="h-4 w-4 mr-1" /> Exit Preview
            </Button>
          </div>
        </div>

        {compiledHtml ? (
          <EmailPreviewFrame html={compiledHtml} />
        ) : (
          <div className="p-6 bg-muted min-h-[300px]">
            <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-sm overflow-hidden p-4">
              {blocks.map(block => (
                <BlockPreview key={block.id} block={block} />
              ))}
              {blocks.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <p>No content yet. Add blocks to build your email.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Editor Mode ──────────────────────────────────────────────

  return (
    <div className="border rounded-lg" style={{ minHeight }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 overflow-x-auto">
        <div className="flex items-center gap-1 flex-shrink-0">
          {BLOCK_PALETTE.map(item => {
            const Icon = getBlockIcon(item.icon)
            return (
              <button
                key={item.type}
                onClick={() => addBlock(item.type, selectedBlockId ? blocks.findIndex(b => b.id === selectedBlockId) : undefined)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-accent transition-colors whitespace-nowrap"
                title={`Add ${item.label}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <div className="relative">
            <button
              onClick={() => setShowVariableMenu(!showVariableMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-accent transition-colors"
              title="Insert variable"
            >
              <Variable className="h-3.5 w-3.5" />
              Variables
            </button>
            {showVariableMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-popover border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                {TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.value}
                    onClick={() => insertVariable(v.value)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <span className="font-medium">{v.label}</span>
                    <span className="ml-2 text-muted-foreground font-mono">{v.value}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1 text-xs h-7">
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-4 space-y-1 bg-muted/50/50">
        {blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Plus className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{placeholder}</p>
            <p className="text-xs mt-1">Use the toolbar above or{' '}
              <button className="text-primary underline" onClick={() => setShowTemplatePicker(true)}>
                pick a template
              </button>
            </p>
          </div>
        )}

        {blocks.map((block, idx) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedBlockId(block.id)}
            className={`group relative rounded-md border transition-all ${
              selectedBlockId === block.id
                ? 'border-primary ring-1 ring-primary/30 bg-white'
                : 'border-transparent hover:border-border bg-white'
            } ${dragOverIndex === idx ? 'border-dashed border-primary/50 bg-primary/5' : ''}`}
          >
            {/* Block header bar */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-transparent group-hover:border-border">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{block.type}</Badge>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1) }} disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30" title="Move up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1) }} disabled={idx === blocks.length - 1}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30" title="Move down">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id) }}
                  className="p-0.5 rounded hover:bg-accent" title="Duplicate">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id) }}
                  className="p-0.5 rounded hover:bg-accent text-red-500" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Block content — inline editing */}
            <div className="px-3 py-2">
              {selectedBlockId === block.id ? (
                <BlockEditor
                  block={block}
                  onUpdate={(data) => updateBlockData(block.id, data)}
                  textareaRef={textareaRef}
                />
              ) : (
                <BlockPreview block={block} compact />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Block count footer */}
      {blocks.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
          <span>{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          <button className="text-primary hover:underline" onClick={() => setShowTemplatePicker(true)}>
            Load template
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Block Editor (inline editing for selected block) ───────────

function BlockEditor({ block, onUpdate, textareaRef }: {
  block: EmailBlock
  onUpdate: (data: Partial<EmailBlock['data']>) => void
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>
}) {
  switch (block.type) {
    case 'heading': {
      const d = block.data as HeadingData
      return (
        <div className="space-y-2">
          <input
            className="w-full text-lg font-bold bg-transparent border-0 outline-none focus:ring-0 p-0"
            value={d.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Enter heading..."
            style={{ color: d.color, textAlign: d.align, fontSize: d.level === 1 ? '24px' : d.level === 2 ? '20px' : '16px' }}
          />
          <div className="flex items-center gap-2 pt-1">
            <select
              className="text-xs border rounded px-1.5 py-0.5"
              value={d.level}
              onChange={(e) => onUpdate({ level: Number(e.target.value) as 1 | 2 | 3 })}
            >
              <option value={1}>H1 — Large</option>
              <option value={2}>H2 — Medium</option>
              <option value={3}>H3 — Small</option>
            </select>
            <AlignButtons align={d.align} onChange={(align) => onUpdate({ align })} />
            <input type="color" className="h-5 w-5 cursor-pointer rounded border" value={d.color} onChange={(e) => onUpdate({ color: e.target.value })} title="Text color" />
          </div>
        </div>
      )
    }

    case 'text': {
      const d = block.data as TextData
      return (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[80px]"
            value={d.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter text..."
            style={{ color: d.color, textAlign: d.align, fontSize: `${d.fontSize}px` }}
          />
          <div className="flex items-center gap-2">
            <AlignButtons align={d.align} onChange={(align) => onUpdate({ align })} />
            <input type="color" className="h-5 w-5 cursor-pointer rounded border" value={d.color} onChange={(e) => onUpdate({ color: e.target.value })} title="Text color" />
            <select
              className="text-xs border rounded px-1.5 py-0.5"
              value={d.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            >
              {[12, 13, 14, 15, 16, 18, 20, 22, 24].map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground ml-auto">Supports: **bold**, *italic*, [links](url), • lists</span>
          </div>
        </div>
      )
    }

    case 'image': {
      const d = block.data as ImageData
      return (
        <div className="space-y-2">
          {d.src ? (
            <img src={d.src} alt={d.alt} className="max-w-full rounded" style={{ maxWidth: d.width === '100%' ? '100%' : d.width }} />
          ) : (
            <div className="flex items-center justify-center h-32 bg-muted/50 rounded-md border-2 border-dashed text-muted-foreground text-sm">
              <ImageIcon className="h-5 w-5 mr-2" /> Enter image URL below
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Image URL *</label>
              <Input className="h-7 text-xs" placeholder="https://..." value={d.src} onChange={(e) => onUpdate({ src: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Alt Text</label>
              <Input className="h-7 text-xs" placeholder="Description" value={d.alt} onChange={(e) => onUpdate({ alt: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Link URL (optional)</label>
              <Input className="h-7 text-xs" placeholder="https://..." value={d.href} onChange={(e) => onUpdate({ href: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Width</label>
              <select className="w-full h-7 text-xs border rounded px-1.5" value={d.width} onChange={(e) => onUpdate({ width: e.target.value })}>
                <option value="100%">Full width</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="300px">300px</option>
                <option value="200px">200px</option>
              </select>
            </div>
          </div>
        </div>
      )
    }

    case 'button': {
      const d = block.data as ButtonData
      return (
        <div className="space-y-2">
          <div className="flex justify-center py-2" style={{ textAlign: d.align }}>
            <span
              className="inline-block px-6 py-2 font-medium cursor-default"
              style={{
                backgroundColor: d.backgroundColor,
                color: d.color,
                borderRadius: `${d.borderRadius}px`,
                fontSize: `${d.fontSize}px`,
              }}
            >
              {d.text || 'Button Text'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Button Text *</label>
              <Input className="h-7 text-xs" value={d.text} onChange={(e) => onUpdate({ text: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Link URL *</label>
              <Input className="h-7 text-xs" placeholder="https://..." value={d.href} onChange={(e) => onUpdate({ href: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">BG Color</label>
                <input type="color" className="h-7 w-7 cursor-pointer rounded border" value={d.backgroundColor} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Text Color</label>
                <input type="color" className="h-7 w-7 cursor-pointer rounded border" value={d.color} onChange={(e) => onUpdate({ color: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground block mb-0.5">Radius</label>
                <Input className="h-7 text-xs" type="number" min={0} max={50} value={d.borderRadius} onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Align</label>
              <AlignButtons align={d.align} onChange={(align) => onUpdate({ align })} />
            </div>
          </div>
        </div>
      )
    }

    case 'divider': {
      const d = block.data as DividerData
      return (
        <div className="space-y-2">
          <hr style={{ borderColor: d.color, borderStyle: d.borderStyle, width: d.width }} />
          <div className="flex items-center gap-2">
            <input type="color" className="h-5 w-5 cursor-pointer rounded border" value={d.color} onChange={(e) => onUpdate({ color: e.target.value })} />
            <select className="text-xs border rounded px-1.5 py-0.5" value={d.borderStyle} onChange={(e) => onUpdate({ borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
            <select className="text-xs border rounded px-1.5 py-0.5" value={d.width} onChange={(e) => onUpdate({ width: e.target.value })}>
              <option value="100%">100%</option>
              <option value="75%">75%</option>
              <option value="50%">50%</option>
              <option value="25%">25%</option>
            </select>
          </div>
        </div>
      )
    }

    case 'spacer': {
      const d = block.data as SpacerData
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-center border-2 border-dashed rounded text-xs text-muted-foreground" style={{ height: `${Math.min(d.height, 80)}px` }}>
            ↕ {d.height}px spacer
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Height:</label>
            <input
              type="range"
              min={8}
              max={120}
              value={d.height}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs w-10 text-right">{d.height}px</span>
          </div>
        </div>
      )
    }

    case 'social': {
      const d = block.data as SocialData
      const SOCIAL_OPTIONS = ['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube', 'Pinterest', 'TikTok']

      const updateNetwork = (idx: number, field: 'name' | 'href', value: string) => {
        const networks = [...d.networks]
        networks[idx] = { ...networks[idx], [field]: value }
        onUpdate({ networks })
      }
      const addNetwork = () => {
        onUpdate({ networks: [...d.networks, { name: 'Twitter', href: '#' }] })
      }
      const removeNetwork = (idx: number) => {
        onUpdate({ networks: d.networks.filter((_, i) => i !== idx) })
      }

      return (
        <div className="space-y-2">
          {d.networks.map((n, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select className="text-xs border rounded px-1.5 py-1 w-28" value={n.name} onChange={(e) => updateNetwork(idx, 'name', e.target.value)}>
                {SOCIAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Input className="h-7 text-xs flex-1" placeholder="https://..." value={n.href} onChange={(e) => updateNetwork(idx, 'href', e.target.value)} />
              <button onClick={() => removeNetwork(idx)} className="text-red-500 p-0.5 hover:bg-red-50 rounded">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addNetwork} className="text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Network
          </Button>
        </div>
      )
    }

    default:
      return <p className="text-sm text-muted-foreground">Unknown block type</p>
  }
}

// ─── Block Preview (read-only render) ───────────────────────────

function BlockPreview({ block, compact }: { block: EmailBlock; compact?: boolean }) {
  switch (block.type) {
    case 'heading': {
      const d = block.data as HeadingData
      const Tag = `h${d.level}` as 'h1' | 'h2' | 'h3'
      const sizes = { 1: '1.5rem', 2: '1.25rem', 3: '1rem' }
      return <Tag style={{ color: d.color, textAlign: d.align, fontSize: sizes[d.level], fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{d.text}</Tag>
    }

    case 'text': {
      const d = block.data as TextData
      // Render content: support basic markdown-like patterns for preview
      const html = renderTextContent(d.content)
      return <div style={{ color: d.color, textAlign: d.align, fontSize: `${d.fontSize}px`, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
    }

    case 'image': {
      const d = block.data as ImageData
      if (!d.src) {
        if (compact) return <div className="flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="h-3 w-3" /> Image (no URL set)</div>
        return (
          <div className="flex items-center justify-center h-24 bg-muted/30 rounded text-muted-foreground text-sm">
            <ImageIcon className="h-5 w-5 mr-1" /> No image URL
          </div>
        )
      }
      return (
        <div style={{ textAlign: d.align }}>
          <img src={d.src} alt={d.alt} style={{ maxWidth: d.width === '100%' ? '100%' : d.width, display: 'inline-block' }} className="rounded" />
        </div>
      )
    }

    case 'button': {
      const d = block.data as ButtonData
      return (
        <div style={{ textAlign: d.align, padding: compact ? '4px 0' : '8px 0' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: d.backgroundColor,
              color: d.color,
              borderRadius: `${d.borderRadius}px`,
              fontSize: `${d.fontSize}px`,
              padding: '10px 24px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {d.text}
          </span>
        </div>
      )
    }

    case 'divider': {
      const d = block.data as DividerData
      return <hr style={{ borderColor: d.color, borderStyle: d.borderStyle, width: d.width, margin: '4px 0' }} />
    }

    case 'spacer': {
      const d = block.data as SpacerData
      if (compact) return <div className="text-[10px] text-muted-foreground text-center">↕ {d.height}px</div>
      return <div style={{ height: `${d.height}px` }} />
    }

    case 'social': {
      const d = block.data as SocialData
      return (
        <div style={{ textAlign: d.align, padding: '8px 0' }}>
          <div className="flex gap-3 justify-center flex-wrap" style={{ justifyContent: d.align === 'center' ? 'center' : d.align === 'right' ? 'flex-end' : 'flex-start' }}>
            {d.networks.map((n, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                {getSocialEmoji(n.name)} {n.name}
              </span>
            ))}
          </div>
        </div>
      )
    }

    default:
      return <p className="text-xs text-muted-foreground">Unknown block</p>
  }
}

// ─── Utilities ──────────────────────────────────────────────────

function AlignButtons({ align, onChange }: { align: string; onChange: (v: 'left' | 'center' | 'right') => void }) {
  return (
    <div className="flex border rounded overflow-hidden">
      {(['left', 'center', 'right'] as const).map(a => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`px-1.5 py-0.5 text-[10px] ${align === a ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
        >
          {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
        </button>
      ))}
    </div>
  )
}

/**
 * Convert basic text with newlines and simple markdown-like patterns to HTML for preview.
 * Handles: **bold**, *italic*, [text](url), newlines, existing HTML tags.
 */
function renderTextContent(text: string): string {
  if (!text) return ''
  // If it already contains HTML tags, use DOMPurify for proper sanitization
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return DOMPurify.sanitize(text.replace(/\n/g, '<br/>'))
  }
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Links: [text](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#2563eb">$1</a>')
  // Bullet lists: lines starting with • or -
  html = html.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>')
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin:4px 0;padding-left:20px">$1</ul>')
  }
  // Newlines
  html = html.replace(/\n/g, '<br/>')
  return html
}

function getSocialEmoji(name: string): string {
  const map: Record<string, string> = {
    Facebook: '📘', Twitter: '🐦', Instagram: '📸', LinkedIn: '💼',
    YouTube: '🎬', Pinterest: '📌', TikTok: '🎵', GitHub: '🐙',
  }
  return map[name] || '🔗'
}

export default EmailBlockEditor
