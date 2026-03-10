import { logger } from '@/lib/logger'
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/Dialog'
import { Search, Filter, Download, LayoutGrid, LayoutList, Users } from 'lucide-react'
import { AdvancedFilters } from '@/components/filters/AdvancedFilters'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips'
import { useToast } from '@/hooks/useToast'
import { leadsApi, usersApi, notesApi, messagesApi, activitiesApi, CreateLeadData, UpdateLeadData, BulkUpdateData } from '@/lib/api'
import { exportToCSV, leadExportColumns } from '@/lib/exportService'
import { Lead } from '@/types'
import type { AssignedUser } from '@/types'
import { getScoreCategory } from '@/utils/scoringUtils'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'
import { SavedFilterViews } from '@/components/leads/SavedFilterViews'
import type { SavedFilterView } from '@/lib/api'

import type { FilterConfig, SortField, SortDirection, ScoreFilterValue } from './list/types'
import { getTimeAgo } from './list/types'
import { LeadStatsCards } from './list/LeadStatsCards'
import { LeadCharts } from './list/LeadCharts'
import { MassEmailModal, TagsModal, StatusModal, AssignModal, BulkDeleteModal, EditLeadModal } from './list/LeadModals'
import { LeadsTable } from './list/LeadsTable'
import { LeadsGrid } from './list/LeadsGrid'

function LeadsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showMassEmail, setShowMassEmail] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [quickNote, setQuickNote] = useState<{ leadId: number; text: string } | null>(null)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterValue>('ALL')
  const { toast } = useToast()

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const [filters, setFilters] = useState<FilterConfig>({
    status: [],
    source: [],
    scoreRange: [0, 100],
    dateRange: { from: '', to: '' },
    tags: [],
    assignedTo: [],
  })

  const [activeFilterChips, setActiveFilterChips] = useState<Array<{ id: string; label: string; value: string }>>([])

  // Mass Email state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [emailErrors, setEmailErrors] = useState<{subject?: string; body?: string}>({})

  // Tags state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Bulk action state
  const [newStatus, setNewStatus] = useState('')
  const [assignToUser, setAssignToUser] = useState('')

  // ── QUERIES ──

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        const members = await usersApi.getTeamMembers()
        return Array.isArray(members) ? members : []
      } catch (error) {
        logger.error('Team members endpoint unavailable, trying fallback:', error)
        const response = await usersApi.getUsers({ limit: 50 })
        return response.data?.users || response.data || []
      }
    },
  })

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', currentPage, pageSize, searchQuery, sortField, sortDirection, filters],
    queryFn: async () => {
      const sortFieldMap: Record<string, string> = {
        name: 'firstName', company: 'createdAt', score: 'score',
        status: 'createdAt', source: 'createdAt', createdAt: 'createdAt', value: 'value',
      }
      const params: Record<string, string | number> = {
        page: currentPage, limit: pageSize,
        sortBy: sortFieldMap[sortField] || 'createdAt',
        sortOrder: sortDirection || 'desc',
      }
      if (searchQuery) params.search = searchQuery
      if (filters.status.length > 0) params.status = filters.status[0]
      if (filters.source.length > 0) params.source = filters.source[0]
      if (filters.scoreRange[0] > 0) params.minScore = filters.scoreRange[0]
      if (filters.scoreRange[1] < 100) params.maxScore = filters.scoreRange[1]
      if (filters.dateRange.from) params.startDate = filters.dateRange.from
      if (filters.dateRange.to) params.endDate = filters.dateRange.to
      if (filters.tags.length > 0) params.tags = filters.tags.join(',')
      if (filters.assignedTo.length > 0) params.assignedTo = filters.assignedTo.join(',')

      const response = await leadsApi.getLeads(params)
      return response.data
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const { data: expandedActivitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['lead-activities', expandedRow],
    queryFn: () => activitiesApi.getLeadActivities(String(expandedRow), { limit: 10 }),
    enabled: !!expandedRow,
    staleTime: 30_000,
  })

  // ── MUTATIONS ──

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead deleted successfully') },
    onError: () => { toast.error('Failed to delete lead') },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (leadIds: string[]) => leadsApi.bulkDelete(leadIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setSelectedLeads([]); toast.success(`${selectedLeads.length} leads deleted`) },
    onError: () => { toast.error('Failed to delete leads') },
  })

  const createLeadMutation = useMutation({
    mutationFn: (leadData: CreateLeadData) => leadsApi.createLead(leadData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead created successfully') },
    onError: () => { toast.error('Failed to create lead') },
  })

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) => leadsApi.updateLead(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead updated successfully') },
    onError: () => { toast.error('Failed to update lead') },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: BulkUpdateData) => leadsApi.bulkUpdate(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setSelectedLeads([]); toast.success(`${selectedLeads.length} leads updated`) },
    onError: () => { toast.error('Failed to update leads') },
  })

  // ── DERIVED DATA ──

  const leads = useMemo(() => {
    if (leadsResponse?.leads && leadsResponse.leads.length > 0) return leadsResponse.leads
    return []
  }, [leadsResponse])

  const [leadNotes, setLeadNotes] = useState<Record<number, string[]>>({})

  const leadStats = useMemo(() => {
    const total = leads.length || 0
    const qualified = leads.filter((l: Lead) => l.status === 'qualified').length || 0
    const avgScore = total > 0 ? Math.round(leads.reduce((sum: number, l: Lead) => sum + l.score, 0) / total) : 0
    const converted = leads.filter((l: Lead) => l.status === 'proposal' || l.status === 'negotiation').length || 0
    return {
      total, qualified,
      qualifiedRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
      avgScore, converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    }
  }, [leads])

  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {}
    leads.forEach((lead: Lead) => { sources[lead.source] = (sources[lead.source] || 0) + 1 })
    return Object.entries(sources).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value,
    }))
  }, [leads])

  const scoreData = useMemo(() => {
    const ranges = { '60-70': 0, '71-80': 0, '81-90': 0, '91-100': 0 }
    leads.forEach((lead: Lead) => {
      if (lead.score >= 91) ranges['91-100']++
      else if (lead.score >= 81) ranges['81-90']++
      else if (lead.score >= 71) ranges['71-80']++
      else ranges['60-70']++
    })
    return Object.entries(ranges).map(([range, count]) => ({ range, count }))
  }, [leads])

  const filteredAndSortedLeads = useMemo(() => {
    if (leadsResponse?.pagination) return leads

    let filtered = leads.filter((lead: Lead) => {
      if (searchQuery && !`${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !lead.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(lead.company || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (scoreFilter !== 'ALL') {
        const leadCategory = getScoreCategory(lead.score || 0)
        if (leadCategory !== scoreFilter) return false
      }
      return true
    })

    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: unknown, bVal: unknown
        if (sortField === 'name') {
          aVal = `${a.firstName} ${a.lastName}`
          bVal = `${b.firstName} ${b.lastName}`
        } else {
          aVal = a[sortField]
          bVal = b[sortField]
        }
        const modifier = sortDirection === 'asc' ? 1 : -1
        if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * modifier
        if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * modifier
        return 0
      })
    }
    return filtered
  }, [leads, searchQuery, sortField, sortDirection, scoreFilter, leadsResponse])

  const paginatedLeads = useMemo(() => {
    if (leadsResponse?.pagination) return leads
    const startIndex = (currentPage - 1) * pageSize
    return filteredAndSortedLeads.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedLeads, currentPage, pageSize, leadsResponse, leads])

  const totalPages = leadsResponse?.pagination?.totalPages || Math.ceil(filteredAndSortedLeads.length / pageSize)
  const totalLeads = leadsResponse?.pagination?.total || filteredAndSortedLeads.length

  // ── HANDLERS ──

  const toggleLeadSelection = (id: number) => {
    setSelectedLeads((prev) => prev.includes(id) ? prev.filter((leadId) => leadId !== id) : [...prev, id])
  }

  const toggleAllSelection = () => {
    if (selectedLeads.length === paginatedLeads.length) setSelectedLeads([])
    else setSelectedLeads(paginatedLeads.map((lead: Lead) => lead.id))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
      if (sortDirection === 'desc') setSortField('createdAt')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleApplyFilters = (newFilters: FilterConfig) => {
    setFilters(newFilters)
    const chips: Array<{ id: string; label: string; value: string }> = []
    newFilters.status.forEach((s, i) => chips.push({ id: `status-${i}`, label: 'Status', value: s }))
    newFilters.source.forEach((s, i) => chips.push({ id: `source-${i}`, label: 'Source', value: s }))
    newFilters.tags.forEach((t, i) => chips.push({ id: `tag-${i}`, label: 'Tag', value: t }))
    newFilters.assignedTo.forEach((a, i) => chips.push({ id: `assigned-${i}`, label: 'Assigned', value: a }))
    if (newFilters.scoreRange[0] > 0 || newFilters.scoreRange[1] < 100) {
      chips.push({ id: 'score', label: 'Score', value: `${newFilters.scoreRange[0]}-${newFilters.scoreRange[1]}` })
    }
    if (newFilters.dateRange.from || newFilters.dateRange.to) {
      chips.push({ id: 'date', label: 'Date', value: `${newFilters.dateRange.from || '...'} to ${newFilters.dateRange.to || '...'}` })
    }
    setActiveFilterChips(chips)
    setCurrentPage(1)
    toast.success('Filters applied successfully')
  }

  const handleRemoveChip = (chipId: string) => {
    setActiveFilterChips((prev) => prev.filter((c) => c.id !== chipId))
  }

  const handleClearAllFilters = () => {
    setFilters({ status: [], source: [], scoreRange: [0, 100], dateRange: { from: '', to: '' }, tags: [], assignedTo: [] })
    setActiveFilterChips([])
    setScoreFilter('ALL')
  }

  const handleLoadSavedView = (view: SavedFilterView) => {
    const fc = view.filterConfig
    setFilters({
      status: fc.status || [], source: fc.source || [],
      scoreRange: fc.scoreRange || [0, 100], dateRange: fc.dateRange || { from: '', to: '' },
      tags: fc.tags || [], assignedTo: fc.assignedTo || [],
    })
    if (view.scoreFilter) setScoreFilter(view.scoreFilter as ScoreFilterValue)
    if (view.sortField) setSortField(view.sortField as SortField)
    if (view.sortDirection) setSortDirection(view.sortDirection as SortDirection)
    setCurrentPage(1)
    toast.success(`Loaded view: ${view.name || 'Saved View'}`)
  }

  const hasActiveFilters = activeFilterChips.length > 0 || scoreFilter !== 'ALL' ||
    filters.status.length > 0 || filters.source.length > 0 ||
    filters.tags.length > 0 || filters.assignedTo.length > 0 ||
    filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100 ||
    filters.dateRange.from !== '' || filters.dateRange.to !== ''

  const handleBulkAction = (action: string) => {
    if (action === 'Bulk email') setShowMassEmail(true)
    else if (action === 'Tags added') setShowTagsModal(true)
    else if (action.startsWith('Status change')) setShowStatusModal(true)
    else if (action.startsWith('Assignment')) setShowAssignModal(true)
    else if (action === 'Delete') setShowDeleteModal(true)
    else if (action === 'Export') handleExportCSV()
    else { toast.success(`${action} applied to ${selectedLeads.length} leads`); setSelectedLeads([]) }
  }

  const handleSendMassEmail = async () => {
    const errors: {subject?: string; body?: string} = {}
    if (!emailSubject.trim()) errors.subject = 'Subject is required'
    if (!emailBody.trim()) errors.body = 'Message is required'
    if (Object.keys(errors).length > 0) { setEmailErrors(errors); return }

    setIsSending(true)
    try {
      const selectedLeadsData = leads.filter((l: Lead) => selectedLeads.includes(l.id))
      const sendPromises = selectedLeadsData.map((lead: Lead) =>
        messagesApi.sendEmail({
          to: lead.email,
          subject: emailSubject.replace('{{name}}', `${lead.firstName}`).replace('{{company}}', lead.company || ''),
          body: emailBody.replace('{{name}}', `${lead.firstName}`).replace('{{company}}', lead.company || ''),
          leadId: String(lead.id),
        })
      )
      await Promise.allSettled(sendPromises)
      toast.success(`Email sent to ${selectedLeads.length} leads!`)
      setShowMassEmail(false); setEmailSubject(''); setEmailBody(''); setSelectedTemplate(''); setEmailErrors({}); setSelectedLeads([])
    } catch (error) {
      logger.error('Failed to send mass email:', error)
      toast.error('Failed to send some emails. Please try again.')
    } finally { setIsSending(false) }
  }

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template)
    if (template === 'welcome') {
      setEmailSubject('Welcome to Our Platform!')
      setEmailBody('Hi {{name}},\n\nWe\'re excited to have you on board!\n\nBest regards,\nThe Team')
    } else if (template === 'followup') {
      setEmailSubject('Following up on our conversation')
      setEmailBody('Hi {{name}},\n\nI wanted to follow up on our recent discussion about {{company}}.\n\nLooking forward to hearing from you!\n\nBest,')
    } else if (template === 'proposal') {
      setEmailSubject('Custom Proposal for {{company}}')
      setEmailBody('Hi {{name}},\n\nAttached is a custom proposal tailored for {{company}}.\n\nPlease let me know if you have any questions.\n\nBest regards,')
    }
    setEmailErrors({})
  }

  const handleApplyTags = () => {
    if (selectedTags.length === 0) { toast.error('Please select at least one tag'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { tags: selectedTags } })
    setShowTagsModal(false); setSelectedTags([])
  }

  const handleStatusChange = () => {
    if (!newStatus) { toast.error('Please select a status'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { status: newStatus.toUpperCase() as Lead['status'] } })
    setShowStatusModal(false); setNewStatus('')
  }

  const handleAssignTo = () => {
    if (!assignToUser) { toast.error('Please select a user'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { assignedToId: assignToUser } })
    setShowAssignModal(false); setAssignToUser('')
  }

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedLeads.map(String))
    setShowDeleteModal(false)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead); setEditErrors({}); setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingLead) return
    const newErrors: Record<string, string> = {}
    if (!editingLead.firstName?.trim()) newErrors.firstName = 'First name is required'
    if (!editingLead.lastName?.trim()) newErrors.lastName = 'Last name is required'
    if (editingLead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingLead.email)) newErrors.email = 'Please enter a valid email address'
    if (editingLead.phone && !/^[+\d\s()-]{7,20}$/.test(editingLead.phone)) newErrors.phone = 'Please enter a valid phone number'
    setEditErrors(newErrors)
    if (Object.keys(newErrors).length > 0) { toast.error('Please fix the validation errors'); return }

    const updateData: UpdateLeadData = {
      firstName: editingLead.firstName, lastName: editingLead.lastName,
      email: editingLead.email, phone: editingLead.phone, company: editingLead.company,
      status: editingLead.status?.toUpperCase() as Lead['status'],
      source: editingLead.source, score: editingLead.score,
      assignedToId: typeof editingLead.assignedTo === 'object' && editingLead.assignedTo !== null
        ? String((editingLead.assignedTo as AssignedUser).id || (editingLead.assignedTo as AssignedUser)._id)
        : editingLead.assignedTo || undefined,
      tags: editingLead.tags,
    }
    updateLeadMutation.mutate({ id: String(editingLead.id), data: updateData })
    setShowEditModal(false); setEditingLead(null)
  }

  const handleDuplicateLead = (lead: Lead) => {
    const createData: CreateLeadData = {
      firstName: lead.firstName, lastName: `${lead.lastName} (Copy)`,
      email: lead.email, phone: lead.phone, company: lead.company,
      status: lead.status, source: lead.source,
      assignedToId: typeof lead.assignedTo === 'object' && lead.assignedTo !== null
        ? String((lead.assignedTo as AssignedUser).id || (lead.assignedTo as AssignedUser)._id)
        : lead.assignedTo || undefined,
      tags: lead.tags,
    }
    createLeadMutation.mutate(createData)
  }

  const handleDeleteSingle = (leadId: number) => {
    setDeletingLeadId(leadId); setShowDeleteConfirm(true)
  }

  const handleExportCSV = () => {
    const selectedLeadsData = leads.filter((l: Lead) => selectedLeads.includes(l.id))
    const data = selectedLeadsData.length > 0 ? selectedLeadsData : filteredAndSortedLeads
    exportToCSV(data, leadExportColumns, { filename: `leads-export-${new Date().toISOString().split('T')[0]}` })
    toast.success(`Exported ${data.length} leads to CSV`)
    setSelectedLeads([])
  }

  const handleAddQuickNote = async (leadId: number) => {
    if (quickNote && quickNote.text.trim()) {
      try {
        await notesApi.createNote({ content: quickNote.text, leadId: String(leadId) })
        setLeadNotes(prev => ({ ...prev, [leadId]: [...(prev[leadId] || []), quickNote.text] }))
        queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
        toast.success('Note added successfully')
      } catch (error) {
        logger.error('Failed to save note:', error)
        toast.error('Failed to save note. Please try again.')
      }
      setQuickNote(null)
    }
  }

  const getRecentActivities = (leadId: number) => {
    const apiActivities = (expandedActivitiesData?.data?.activities || []).map((a: any) => ({
      type: a.type || 'note', desc: a.description || a.type || 'Activity',
      time: getTimeAgo(a.createdAt), details: a.metadata ? JSON.stringify(a.metadata) : '',
    }))
    const localNotes = (leadNotes[leadId] || []).map((note) => ({
      type: 'note', desc: note, time: 'Just now', details: '',
    }))
    return [...apiActivities, ...localNotes]
  }

  // ── RENDER ──

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6"><div className="h-24 animate-pulse bg-muted rounded" /></Card>
          ))}
        </div>
        <Card className="p-6"><div className="h-96 animate-pulse bg-muted rounded" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <LeadStatsCards stats={leadStats} totalLeads={totalLeads} currentPage={currentPage} totalPages={totalPages} />

      {/* Charts */}
      <LeadCharts sourceData={sourceData} scoreData={scoreData} />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedLeads.length}
        onClearSelection={() => setSelectedLeads([])}
        onChangeStatus={(status) => handleBulkAction(`Status change:${status}`)}
        onAddTags={() => handleBulkAction('Tags added')}
        onAssignTo={(person) => handleBulkAction(`Assignment:${person}`)}
        onExport={() => handleBulkAction('Export')}
        onDelete={() => handleBulkAction('Delete')}
        onBulkEmail={() => handleBulkAction('Bulk email')}
      />

      {/* Advanced Filters Panel */}
      <AdvancedFilters isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={handleApplyFilters} currentFilters={filters} />

      {/* Modals */}
      {showMassEmail && (
        <MassEmailModal
          selectedCount={selectedLeads.length}
          emailSubject={emailSubject} emailBody={emailBody}
          selectedTemplate={selectedTemplate} emailErrors={emailErrors}
          isSending={isSending}
          onClose={() => { setShowMassEmail(false); setEmailErrors({}) }}
          onSubjectChange={setEmailSubject} onBodyChange={setEmailBody}
          onTemplateSelect={handleTemplateSelect} onSend={handleSendMassEmail}
          onClearErrors={(field) => setEmailErrors(prev => ({ ...prev, [field]: undefined }))}
        />
      )}
      {showTagsModal && (
        <TagsModal
          selectedTags={selectedTags} newTag={newTag}
          onClose={() => setShowTagsModal(false)}
          onToggleTag={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
          onNewTagChange={setNewTag}
          onAddNewTag={() => { if (newTag.trim()) { setSelectedTags(prev => [...prev, newTag.trim()]); setNewTag('') } }}
          onApply={handleApplyTags}
        />
      )}
      {showStatusModal && (
        <StatusModal newStatus={newStatus} onClose={() => setShowStatusModal(false)} onStatusChange={setNewStatus} onApply={handleStatusChange} />
      )}
      {showAssignModal && (
        <AssignModal assignToUser={assignToUser} teamMembers={teamMembers} onClose={() => setShowAssignModal(false)} onAssignChange={setAssignToUser} onApply={handleAssignTo} />
      )}
      {showDeleteModal && (
        <BulkDeleteModal selectedCount={selectedLeads.length} onClose={() => setShowDeleteModal(false)} onDelete={handleBulkDelete} />
      )}
      {showEditModal && editingLead && (
        <EditLeadModal
          editingLead={editingLead} editErrors={editErrors} teamMembers={teamMembers}
          onClose={() => { setShowEditModal(false); setEditingLead(null) }}
          onLeadChange={setEditingLead} onSave={handleSaveEdit}
        />
      )}

      {/* Sub Navigation */}
      <LeadsSubNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-2 text-muted-foreground">Manage and track all your leads in one place</p>
        </div>
      </div>

      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as ScoreFilterValue)}
              className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
            >
              <option value="ALL">All Scores</option>
              <option value="HOT">🔥 Hot (80-100)</option>
              <option value="WARM">🟡 Warm (50-79)</option>
              <option value="COOL">❄️ Cool (25-49)</option>
              <option value="COLD">⚫ Cold (0-24)</option>
            </select>
            <Button variant="outline" onClick={() => setShowFilters(true)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Link to="/leads/import">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Link>
            <div className="flex rounded-lg border">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-r-none border-r-0" title="Table View" onClick={() => setViewMode('table')}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="rounded-none border-r-0" title="Grid View" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Link to="/leads/pipeline">
                <Button variant={'ghost'} size="sm" className="rounded-l-none" title="Pipeline View">
                  <LayoutGrid className="h-4 w-4 rotate-45" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Filter Chips */}
      <ActiveFilterChips chips={activeFilterChips} onRemove={handleRemoveChip} onClearAll={handleClearAllFilters} resultCount={filteredAndSortedLeads.length} />

      {/* Saved Filter Views */}
      <div className="px-1">
        <SavedFilterViews
          currentFilters={filters} currentScoreFilter={scoreFilter}
          currentSortField={sortField} currentSortDirection={sortDirection ?? undefined}
          onLoadView={handleLoadSavedView} hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Leads Content */}
      {filteredAndSortedLeads.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Users className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No leads yet</h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Import your contacts or add your first lead to get started tracking your sales pipeline.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/leads/create">
                <Button size="lg" className="shadow-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Add Your First Lead
                </Button>
              </Link>
              <Link to="/leads/import">
                <Button variant="outline" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Import from CSV
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              You can also import leads from other CRMs or add them via the API.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'table' ? (
            <LeadsTable
              leads={paginatedLeads}
              selectedLeads={selectedLeads}
              expandedRow={expandedRow}
              sortField={sortField}
              sortDirection={sortDirection}
              activitiesLoading={activitiesLoading}
              quickNote={quickNote}
              onToggleSelection={toggleLeadSelection}
              onToggleAllSelection={toggleAllSelection}
              onExpandRow={setExpandedRow}
              onSort={handleSort}
              onEditLead={handleEditLead}
              onDuplicateLead={handleDuplicateLead}
              onDeleteLead={handleDeleteSingle}
              onSendEmail={(leadId) => { setSelectedLeads([leadId]); setShowMassEmail(true) }}
              onQuickNoteChange={setQuickNote}
              onAddQuickNote={handleAddQuickNote}
              getRecentActivities={getRecentActivities}
            />
          ) : (
            <LeadsGrid
              leads={paginatedLeads}
              selectedLeads={selectedLeads}
              onToggleSelection={toggleLeadSelection}
              onEditLead={handleEditLead}
              onDuplicateLead={handleDuplicateLead}
              onDeleteLead={handleDeleteSingle}
              onSendEmail={(leadId) => { setSelectedLeads([leadId]); setShowMassEmail(true) }}
            />
          )}

          {/* Pagination */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <select className="border rounded-md p-1 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  per page • Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedLeads.length)} of {filteredAndSortedLeads.length} results
                </span>
              </div>

              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2
                  if (pageNum > totalPages) return null
                  return (
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <Button variant="ghost" size="sm" disabled>...</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletingLeadId(null) }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { if (deletingLeadId) { deleteMutation.mutate(String(deletingLeadId)); setShowDeleteConfirm(false); setDeletingLeadId(null) } }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default LeadsList
