import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MoreHorizontal, Mail, Phone } from 'lucide-react'
import { ScoreBadge } from '@/components/ai/ScoreBadge'
import type { Lead } from '@/types'
import type { TagObject, UserObject } from './types'
import { getStatusVariant } from './types'
import { RowMenu } from './LeadsTable'

interface LeadsGridProps {
  leads: Lead[]
  selectedLeads: number[]
  onToggleSelection: (id: number) => void
  onEditLead: (lead: Lead) => void
  onDuplicateLead: (lead: Lead) => void
  onDeleteLead: (id: number) => void
  onSendEmail: (leadId: number) => void
}

export function LeadsGrid({
  leads, selectedLeads, onToggleSelection,
  onEditLead, onDuplicateLead, onDeleteLead, onSendEmail,
}: LeadsGridProps) {
  const [showRowMenu, setShowRowMenu] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)

  const openRowMenu = useCallback((leadId: number, buttonEl: HTMLButtonElement) => {
    if (showRowMenu === leadId) {
      setShowRowMenu(null)
      setMenuPos(null)
      return
    }
    const rect = buttonEl.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 })
    setShowRowMenu(leadId)
  }, [showRowMenu])

  useEffect(() => {
    if (!showRowMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setShowRowMenu(null)
        setMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRowMenu])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {leads.map((lead: Lead) => (
        <Card key={lead.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <input
              type="checkbox"
              checked={selectedLeads.includes(lead.id)}
              onChange={() => onToggleSelection(lead.id)}
              className="rounded mt-1"
            />
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => openRowMenu(lead.id, e.currentTarget)}
                aria-label="Lead actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showRowMenu === lead.id && menuPos && createPortal(
                <RowMenu
                  ref={rowMenuRef}
                  lead={lead}
                  style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                  onEdit={() => { onEditLead(lead); setShowRowMenu(null) }}
                  onDuplicate={() => { onDuplicateLead(lead); setShowRowMenu(null) }}
                  onEmail={() => { onSendEmail(lead.id); setShowRowMenu(null) }}
                  onDelete={() => { onDeleteLead(lead.id); setShowRowMenu(null) }}
                  onClose={() => { setShowRowMenu(null); setMenuPos(null) }}
                />,
                document.body
              )}
            </div>
          </div>

          <Link to={`/leads/${lead.id}`} className="block mb-3">
            <h3 className="font-semibold text-lg hover:text-primary">{`${lead.firstName} ${lead.lastName}`}</h3>
            <p className="text-sm text-muted-foreground">{lead.company}</p>
          </Link>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{lead.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{lead.phone}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <ScoreBadge score={lead.score || 0} showValue />
            </div>
            <Badge variant={getStatusVariant(lead.status)} className="capitalize">
              {lead.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {(lead.tags || []).slice(0, 2).map((tag: string | TagObject, idx: number) => {
              const tagName = typeof tag === 'string' ? tag : tag?.name || 'Unknown'
              return (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tagName}
                </Badge>
              )
            })}
            {(lead.tags || []).length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{(lead.tags || []).length - 2}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t text-sm">
            <span className="text-muted-foreground capitalize">{lead.source}</span>
            <span className={(() => {
                if (typeof lead.assignedTo === 'string') {
                  return 'text-muted-foreground'
                }
                if (lead.assignedTo && typeof lead.assignedTo === 'object' && 'firstName' in lead.assignedTo) {
                  return 'text-muted-foreground'
                }
                return 'text-muted-foreground/60 italic'
              })()}>
              {(() => {
                if (typeof lead.assignedTo === 'string') {
                  return lead.assignedTo
                }
                if (lead.assignedTo && typeof lead.assignedTo === 'object' && 'firstName' in lead.assignedTo) {
                  const user = lead.assignedTo as UserObject
                  return `${user.firstName} ${user.lastName}`
                }
                return 'Unassigned'
              })()}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
