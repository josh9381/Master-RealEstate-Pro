import React, { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/Table'
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
  MoreHorizontal, Mail, Phone, FileText, Users, Target, TrendingUp,
  MessageSquare, X,
} from 'lucide-react'
import { ScoreBadge } from '@/components/ai/ScoreBadge'
import type { Lead } from '@/types'
import type { TagObject, UserObject, SortField, SortDirection, ActivityItem } from './types'
import { getStatusVariant } from './types'

interface LeadsTableProps {
  leads: Lead[]
  selectedLeads: number[]
  expandedRow: number | null
  sortField: SortField
  sortDirection: SortDirection
  activitiesLoading: boolean
  quickNote: { leadId: number; text: string } | null
  onToggleSelection: (id: number) => void
  onToggleAllSelection: () => void
  onExpandRow: (id: number | null) => void
  onSort: (field: SortField) => void
  onEditLead: (lead: Lead) => void
  onDuplicateLead: (lead: Lead) => void
  onDeleteLead: (id: number) => void
  onSendEmail: (leadId: number) => void
  onQuickNoteChange: (note: { leadId: number; text: string } | null) => void
  onAddQuickNote: (leadId: number) => void
  getRecentActivities: (leadId: number) => ActivityItem[]
}

export function LeadsTable({
  leads, selectedLeads, expandedRow, sortField, sortDirection,
  activitiesLoading, quickNote,
  onToggleSelection, onToggleAllSelection, onExpandRow, onSort,
  onEditLead, onDuplicateLead, onDeleteLead, onSendEmail,
  onQuickNoteChange, onAddQuickNote, getRecentActivities,
}: LeadsTableProps) {
  const [showRowMenu, setShowRowMenu] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [, setSearchParams] = useSearchParams()
  const rowMenuRef = useRef<HTMLDivElement>(null)

  const openRowMenu = useCallback((leadId: number, buttonEl: HTMLButtonElement) => {
    if (showRowMenu === leadId) {
      setShowRowMenu(null)
      setMenuPos(null)
      return
    }
    const rect = buttonEl.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 }) // 192 = w-48
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3" />
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-hidden">
      <Table className="[&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2.5 text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 pr-0">
              <input
                type="checkbox"
                checked={selectedLeads.length === leads.length && leads.length > 0}
                onChange={onToggleAllSelection}
                className="rounded"
                title={`Select all ${leads.length} leads on this page`}
                aria-label={`Select all ${leads.length} leads on this page`}
              />
            </TableHead>
            <TableHead className="w-8 px-0"></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSort('name')}>
              <div className="flex items-center whitespace-nowrap">
                Name
                {getSortIcon('name')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSort('company')}>
              <div className="flex items-center whitespace-nowrap">
                Company
                {getSortIcon('company')}
              </div>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden xl:table-cell whitespace-nowrap">Phone</TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSort('score')}>
              <div className="flex items-center whitespace-nowrap">
                Score
                {getSortIcon('score')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSort('status')}>
              <div className="flex items-center whitespace-nowrap">
                Status
                {getSortIcon('status')}
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSort('source')}>
              <div className="flex items-center whitespace-nowrap">
                Source
                {getSortIcon('source')}
              </div>
            </TableHead>
            <TableHead className="hidden 2xl:table-cell">Tags</TableHead>
            <TableHead className="hidden xl:table-cell whitespace-nowrap">Assigned</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead: Lead) => (
            <React.Fragment key={lead.id}>
              <TableRow>
                <TableCell className="pr-0">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => onToggleSelection(lead.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell className="px-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onExpandRow(expandedRow === lead.id ? null : lead.id)}
                    aria-label={expandedRow === lead.id ? 'Collapse row' : 'Expand row'}
                  >
                    {expandedRow === lead.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="truncate max-w-[120px]">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {`${lead.firstName} ${lead.lastName}`}
                  </Link>
                </TableCell>
                <TableCell className="truncate max-w-[100px]">{lead.company}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[160px]">{lead.email}</TableCell>
                <TableCell className="hidden xl:table-cell text-muted-foreground whitespace-nowrap">{lead.phone}</TableCell>
                <TableCell>
                  <ScoreBadge score={lead.score || 0} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(lead.status)}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell capitalize truncate max-w-[80px]">{lead.source}</TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(lead.tags || []).slice(0, 2).map((tag: string | TagObject, idx: number) => {
                      const tagName = typeof tag === 'string' ? tag : tag?.name || 'Unknown'
                      return (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSearchParams({ tags: tagName }) }}
                        >
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
                </TableCell>
                <TableCell className="hidden xl:table-cell truncate max-w-[110px]">
                  {(() => {
                    if (typeof lead.assignedTo === 'string') {
                      return lead.assignedTo
                    }
                    if (lead.assignedTo && typeof lead.assignedTo === 'object' && 'firstName' in lead.assignedTo) {
                      const user = lead.assignedTo as UserObject
                      return `${user.firstName} ${user.lastName}`
                    }
                    return <span className="text-muted-foreground/60 italic">Unassigned</span>
                  })()}
                </TableCell>
                <TableCell>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
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
                </TableCell>
              </TableRow>

              {/* Expandable Row - Activity Timeline */}
              {expandedRow === lead.id && (
                <TableRow>
                  <TableCell colSpan={12} className="bg-muted/30">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Recent Activity</h4>
                      </div>

                      <div className="space-y-3">
                        {activitiesLoading && expandedRow === lead.id ? (
                          <div className="text-sm text-muted-foreground">Loading activities...</div>
                        ) : getRecentActivities(lead.id).length === 0 ? (
                          <div className="text-sm text-muted-foreground">No activities yet</div>
                        ) : (
                          getRecentActivities(lead.id).map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <div className="mt-1">
                                {activity.type === 'email' && <Mail className="h-4 w-4 text-primary" />}
                                {activity.type === 'call' && <Phone className="h-4 w-4 text-success" />}
                                {activity.type === 'note' && <FileText className="h-4 w-4 text-warning" />}
                                {activity.type === 'meeting' && <Users className="h-4 w-4 text-purple-600" />}
                                {activity.type === 'task' && <Target className="h-4 w-4 text-indigo-600" />}
                                {activity.type === 'status_change' && <TrendingUp className="h-4 w-4 text-warning" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{activity.desc}</p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick Note */}
                      <div className="pt-3 border-t">
                        <div className="flex gap-2">
                          {quickNote?.leadId === lead.id ? (
                            <>
                              <Input
                                placeholder="Add a quick note..."
                                value={quickNote?.text || ''}
                                onChange={(e) => onQuickNoteChange({ leadId: lead.id, text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onAddQuickNote(lead.id)
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={() => onAddQuickNote(lead.id)}>
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => onQuickNoteChange(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onQuickNoteChange({ leadId: lead.id, text: '' })}
                              className="w-full"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Add Quick Note
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      </div>
    </Card>
  )
}

// ── Shared Row Menu (used by both Table and Grid) ──

interface RowMenuProps {
  lead: Lead
  style?: React.CSSProperties
  onEdit: () => void
  onDuplicate: () => void
  onEmail: () => void
  onDelete: () => void
  onClose: () => void
}

export const RowMenu = React.forwardRef<HTMLDivElement, RowMenuProps>(
  ({ lead, style, onEdit, onDuplicate, onEmail, onDelete, onClose }, ref) => {
    return (
      <div
        ref={ref}
        className="w-48 bg-popover text-popover-foreground rounded-md shadow-lg border"
        style={style || { position: 'absolute', right: 0, marginTop: 4, zIndex: 50 }}
        role="menu"
        aria-label="Lead actions"
        onKeyDown={(e: React.KeyboardEvent) => {
          const items = Array.from(e.currentTarget.querySelectorAll('[role="menuitem"]:not([disabled])')) as HTMLElement[]
          const idx = items.indexOf(e.target as HTMLElement)
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            items[(idx + 1) % items.length]?.focus()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            items[(idx - 1 + items.length) % items.length]?.focus()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
      >
        <div className="py-1">
          <button
            role="menuitem"
            className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            onClick={onEdit}
          >
            <FileText className="h-4 w-4" />
            Edit
          </button>
          <button
            role="menuitem"
            className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            onClick={onDuplicate}
          >
            <FileText className="h-4 w-4" />
            Duplicate
          </button>
          <button
            role="menuitem"
            className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            onClick={onEmail}
          >
            <Mail className="h-4 w-4" />
            Send Email
          </button>
          {lead.phone ? (
            <a
              role="menuitem"
              href={`tel:${lead.phone}`}
              className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
              onClick={onClose}
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          ) : (
            <button
              role="menuitem"
              className="w-full px-4 py-2 text-sm text-left text-muted-foreground cursor-not-allowed flex items-center gap-2 hover:bg-accent"
              disabled
              aria-disabled="true"
            >
              <Phone className="h-4 w-4" />
              No phone number
            </button>
          )}
          <div className="border-t my-1"></div>
          <button
            role="menuitem"
            className="w-full px-4 py-2 text-sm text-left hover:bg-destructive/10 text-destructive flex items-center gap-2"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    )
  }
)

RowMenu.displayName = 'RowMenu'
