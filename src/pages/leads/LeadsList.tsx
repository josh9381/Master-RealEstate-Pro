import { logger } from '@/lib/logger'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/Dialog'
import { Search, Filter, Download, LayoutGrid, LayoutList, Users, Tag as TagIcon } from 'lucide-react'
import { AdvancedFilters } from '@/components/filters/AdvancedFilters'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips'
import { useToast } from '@/hooks/useToast'
import { leadsApi, usersApi, notesApi, messagesApi, activitiesApi, pipelinesApi, tagsApi, segmentsApi, CreateLeadData, UpdateLeadData, BulkUpdateData, PipelineData } from '@/lib/api'
import { exportToCSV, leadExportColumns } from '@/lib/exportService'
import { Lead } from '@/types'
import type { AssignedUser } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { SavedFilterViews } from '@/components/leads/SavedFilterViews'
import type { SavedFilterView } from '@/lib/api'

import type { FilterConfig, SortField, SortDirection, ScoreFilterValue } from './list/types'
import { getTimeAgo } from './list/types'
import { MassEmailModal, TagsModal, StatusModal, AssignModal, BulkDeleteModal, EditLeadModal } from './list/LeadModals'
import { LeadsTable } from './list/LeadsTable'
import { LeadsGrid } from './list/LeadsGrid'

function LeadsList() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL params
  const initFromUrl = useCallback(() => {
    const sp = searchParams
  const VALID_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'score', 'status', 'source'])
  const VALID_SORT_DIRS = new Set(['asc', 'desc'])
  const VALID_SCORE_FILTERS = new Set(['ALL', 'HOT', 'WARM', 'COLD', 'UNSCORED'])

  return {
      search: sp.get('search') || '',
      status: sp.get('status')?.split(',').filter(Boolean) || [],
      source: sp.get('source')?.split(',').filter(Boolean) || [],
      scoreMin: Math.max(0, Math.min(100, parseInt(sp.get('scoreMin') || '0') || 0)),
      scoreMax: Math.max(0, Math.min(100, parseInt(sp.get('scoreMax') || '100') || 100)),
      dateFrom: sp.get('dateFrom') || '',
      dateTo: sp.get('dateTo') || '',
      tags: sp.get('tags')?.split(',').filter(Boolean) || [],
      assignedTo: sp.get('assignedTo')?.split(',').filter(Boolean) || [],
      page: Math.max(1, parseInt(sp.get('page') || '1') || 1),
      pageSize: Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10') || 10)),
      sortBy: (VALID_SORT_FIELDS.has(sp.get('sortBy') || '') ? sp.get('sortBy') : 'createdAt') as SortField,
      sortDir: (VALID_SORT_DIRS.has(sp.get('sortDir') || '') ? sp.get('sortDir') : 'desc') as SortDirection,
      scoreFilter: (VALID_SCORE_FILTERS.has(sp.get('scoreFilter') || '') ? sp.get('scoreFilter') : 'ALL') as ScoreFilterValue,
    }
  }, [searchParams])

  const urlState = initFromUrl()

  const [searchQuery, setSearchQuery] = useState(urlState.search)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlState.search)
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showMassEmail, setShowMassEmail] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [quickNote, setQuickNote] = useState<{ leadId: number; text: string } | null>(null)
  const [sortField, setSortField] = useState<SortField>(urlState.sortBy)
  const [sortDirection, setSortDirection] = useState<SortDirection>(urlState.sortDir)
  const [currentPage, setCurrentPage] = useState(urlState.page)
  const [pageSize, setPageSize] = useState(urlState.pageSize)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('leadsViewMode') as 'table' | 'grid') || 'table'
  })
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterValue>(urlState.scoreFilter)
  const { toast } = useToast()

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [showSaveSegment, setShowSaveSegment] = useState(false)
  const [saveSegmentName, setSaveSegmentName] = useState('')

  const queryClient = useQueryClient()

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, scoreFilter])

  const [filters, setFilters] = useState<FilterConfig>({
    status: urlState.status,
    source: urlState.source,
    scoreRange: [urlState.scoreMin, urlState.scoreMax] as [number, number],
    dateRange: { from: urlState.dateFrom, to: urlState.dateTo },
    tags: urlState.tags,
    assignedTo: urlState.assignedTo,
  })

  const [activeFilterChips, setActiveFilterChips] = useState<Array<{ id: string; label: string; value: string }>>([])

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery)
    if (filters.status.length > 0) params.set('status', filters.status.join(','))
    if (filters.source.length > 0) params.set('source', filters.source.join(','))
    if (filters.scoreRange[0] > 0) params.set('scoreMin', String(filters.scoreRange[0]))
    if (filters.scoreRange[1] < 100) params.set('scoreMax', String(filters.scoreRange[1]))
    if (filters.dateRange.from) params.set('dateFrom', filters.dateRange.from)
    if (filters.dateRange.to) params.set('dateTo', filters.dateRange.to)
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','))
    if (filters.assignedTo.length > 0) params.set('assignedTo', filters.assignedTo.join(','))
    if (currentPage > 1) params.set('page', String(currentPage))
    if (pageSize !== 10) params.set('pageSize', String(pageSize))
    if (sortField !== 'createdAt') params.set('sortBy', sortField)
    if (sortDirection !== 'desc') params.set('sortDir', sortDirection || '')
    if (scoreFilter !== 'ALL') params.set('scoreFilter', scoreFilter)
    setSearchParams(params, { replace: true })
  }, [debouncedSearchQuery, filters, currentPage, pageSize, sortField, sortDirection, scoreFilter, setSearchParams])

  // Tags state (no longer needed, owned by modal)

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

  const { data: leadsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['leads', currentPage, pageSize, debouncedSearchQuery, sortField, sortDirection, filters, scoreFilter],
    queryFn: async () => {
      const sortFieldMap: Record<string, string> = {
        name: 'firstName', company: 'company', score: 'score',
        status: 'status', source: 'source', createdAt: 'createdAt', value: 'value',
      }
      const params: Record<string, string | number> = {
        page: currentPage, limit: pageSize,
        sortBy: sortFieldMap[sortField] || 'createdAt',
        sortOrder: sortDirection || 'desc',
      }
      if (debouncedSearchQuery) params.search = debouncedSearchQuery
      if (filters.status.length > 0) params.status = filters.status.join(',')
      if (filters.source.length > 0) params.source = filters.source.join(',')

      // Apply score filter as server-side params (1.2)
      const scoreRanges: Record<string, [number, number]> = {
        HOT: [80, 100], WARM: [50, 79], COOL: [25, 49], COLD: [0, 24],
      }
      if (scoreFilter !== 'ALL' && scoreRanges[scoreFilter]) {
        const [min, max] = scoreRanges[scoreFilter]
        params.minScore = min
        params.maxScore = max
      } else {
        if (filters.scoreRange[0] > 0) params.minScore = filters.scoreRange[0]
        if (filters.scoreRange[1] < 100) params.maxScore = filters.scoreRange[1]
      }
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

  // Pipelines query for bulk pipeline assignment
  const { data: pipelinesData } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const res = await pipelinesApi.getPipelines()
      return res.data || []
    },
    enabled: showPipelineModal,
  })

  // Tags query for quick-filter dropdown
  const { data: allTagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getTags(),
  })
  const allTags: string[] = (() => {
    const raw = allTagsData?.data?.tags || allTagsData?.data || allTagsData?.tags || allTagsData || []
    if (!Array.isArray(raw)) return []
    return raw.map((t: { name: string }) => t.name as string)
  })()

  const pipelines: PipelineData[] = Array.isArray(pipelinesData) ? pipelinesData : []
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)

  // ── DERIVED DATA ──

  const leads = useMemo(() => {
    if (leadsResponse?.leads && leadsResponse.leads.length > 0) return leadsResponse.leads
    return []
  }, [leadsResponse])

  const [leadNotes, setLeadNotes] = useState<Record<number, string[]>>({})

  const filteredAndSortedLeads = useMemo(() => {
    // Score filter is now server-side; only apply client-side sort fallback when no server pagination
    if (leadsResponse?.pagination) {
      return leads
    }

    let filtered = [...leads]

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
  }, [leads, sortField, sortDirection, leadsResponse])

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
    // Also update the underlying filters state
    setFilters(prev => {
      const updated = { ...prev }
      if (chipId.startsWith('status-')) {
        const idx = parseInt(chipId.replace('status-', ''))
        updated.status = prev.status.filter((_, i) => i !== idx)
      } else if (chipId.startsWith('source-')) {
        const idx = parseInt(chipId.replace('source-', ''))
        updated.source = prev.source.filter((_, i) => i !== idx)
      } else if (chipId.startsWith('tag-')) {
        const idx = parseInt(chipId.replace('tag-', ''))
        updated.tags = prev.tags.filter((_, i) => i !== idx)
      } else if (chipId.startsWith('assigned-')) {
        const idx = parseInt(chipId.replace('assigned-', ''))
        updated.assignedTo = prev.assignedTo.filter((_, i) => i !== idx)
      } else if (chipId === 'score') {
        updated.scoreRange = [0, 100]
      } else if (chipId === 'date') {
        updated.dateRange = { from: '', to: '' }
      }
      return updated
    })
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

  const handleSaveAsSegment = async () => {
    if (!saveSegmentName.trim()) { toast.error('Please enter a segment name'); return }
    const rules: { field: string; operator: string; value: string[] | { min: number; max: number } }[] = []
    if (filters.status.length > 0) rules.push({ field: 'status', operator: 'in', value: filters.status })
    if (filters.source.length > 0) rules.push({ field: 'source', operator: 'in', value: filters.source })
    if (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100) rules.push({ field: 'score', operator: 'between', value: { min: filters.scoreRange[0], max: filters.scoreRange[1] } })
    if (filters.tags.length > 0) rules.push({ field: 'tags', operator: 'includesAny', value: filters.tags })
    if (rules.length === 0) { toast.error('No active filters to save as segment'); return }
    try {
      await segmentsApi.createSegment({ name: saveSegmentName.trim(), rules, matchType: 'ALL' })
      toast.success(`Segment "${saveSegmentName}" created`)
      setShowSaveSegment(false)
      setSaveSegmentName('')
    } catch {
      toast.error('Failed to create segment')
    }
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
    else if (action === 'Pipeline') setShowPipelineModal(true)
    else if (action === 'Export') handleExportCSV()
    else { toast.success(`${action} applied to ${selectedLeads.length} leads`); setSelectedLeads([]) }
  }

  const handleSendMassEmail = async (data: { subject: string; body: string; template: string }) => {
    setIsSending(true)
    try {
      const selectedLeadsData = leads.filter((l: Lead) => selectedLeads.includes(l.id))
      const sendPromises = selectedLeadsData.map((lead: Lead) =>
        messagesApi.sendEmail({
          to: lead.email,
          subject: data.subject.replace('{{name}}', `${lead.firstName}`).replace('{{company}}', lead.company || ''),
          body: data.body.replace('{{name}}', `${lead.firstName}`).replace('{{company}}', lead.company || ''),
          leadId: String(lead.id),
        })
      )
      const results = await Promise.allSettled(sendPromises)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed === 0) {
        toast.success(`Email sent to ${succeeded} leads!`)
      } else if (succeeded > 0) {
        toast.warning(`Sent to ${succeeded} leads, failed for ${failed}`)
      } else {
        toast.error('Failed to send emails. Please try again.')
      }
      setShowMassEmail(false); setSelectedLeads([])
    } catch (error) {
      logger.error('Failed to send mass email:', error)
      toast.error('Failed to send some emails. Please try again.')
    } finally { setIsSending(false) }
  }

  const handleApplyTags = (tags: string[]) => {
    if (tags.length === 0) { toast.error('Please select at least one tag'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { tags } })
    setShowTagsModal(false)
  }

  const handleStatusChange = (status: string) => {
    if (!status) { toast.error('Please select a status'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { status: status.toUpperCase() as Lead['status'] } })
    setShowStatusModal(false)
  }

  const handleAssignTo = (userId: string) => {
    if (!userId) { toast.error('Please select a user'); return }
    bulkUpdateMutation.mutate({ leadIds: selectedLeads.map(String), updates: { assignedToId: userId } })
    setShowAssignModal(false)
  }

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedLeads.map(String))
    setShowDeleteModal(false)
  }

  const handleAddToPipeline = async () => {
    if (!selectedPipelineId || !selectedStageId) { toast.error('Please select a pipeline and stage'); return }
    try {
      await Promise.all(selectedLeads.map(id =>
        pipelinesApi.moveLeadToStage(String(id), { pipelineId: selectedPipelineId, pipelineStageId: selectedStageId })
      ))
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      toast.success(`${selectedLeads.length} leads added to pipeline`)
      setShowPipelineModal(false)
      setSelectedPipelineId('')
      setSelectedStageId('')
      setSelectedLeads([])
    } catch {
      toast.error('Failed to add leads to pipeline')
    }
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
    if (editingLead.phone && !/^\+?[\d\s()-]{7,20}$/.test(editingLead.phone)) newErrors.phone = 'Please enter a valid phone number'
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

  const canExport = useAuthStore((s) => s.hasPermission('canExportData'));

  const handleExportCSV = () => {
    if (!canExport) {
      toast.error('You don\'t have permission to export data')
      return
    }
    try {
      const selectedLeadsData = leads.filter((l: Lead) => selectedLeads.includes(l.id))
      const data = selectedLeadsData.length > 0 ? selectedLeadsData : filteredAndSortedLeads
      const MAX_EXPORT = 1000
      if (data.length >= MAX_EXPORT) {
        toast.warning(`Export is limited to ${MAX_EXPORT} records. ${totalLeads > MAX_EXPORT ? `${totalLeads - MAX_EXPORT} leads were not included.` : ''}`)
      }
      exportToCSV(data.slice(0, MAX_EXPORT), leadExportColumns, { filename: `leads-export-${new Date().toISOString().split('T')[0]}` })
      toast.success(`Exported ${Math.min(data.length, MAX_EXPORT)} leads to CSV`)
      setSelectedLeads([])
    } catch (error) {
      logger.error('Failed to export leads:', error)
      toast.error('Failed to export leads. Please try again.')
    }
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
    const apiActivities = (expandedActivitiesData?.data?.activities || []).map((a: Record<string, unknown>) => ({
      type: (a.type as string) || 'note', desc: (a.description as string) || (a.type as string) || 'Activity',
      time: getTimeAgo(a.createdAt as string), details: a.metadata ? JSON.stringify(a.metadata) : '',
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
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>

      {/* Bulk Actions Bar */}
      {selectedLeads.length > 0 && (
        <BulkActionsBar
        selectedCount={selectedLeads.length}
        totalOnPage={paginatedLeads.length}
        onClearSelection={() => setSelectedLeads([])}
        onChangeStatus={(status) => handleBulkAction(`Status change:${status}`)}
        onAddTags={() => handleBulkAction('Tags added')}
        onAssignTo={(person) => handleBulkAction(`Assignment:${person}`)}
        onAddToPipeline={() => handleBulkAction('Pipeline')}
        onExport={() => handleBulkAction('Export')}
        onDelete={() => handleBulkAction('Delete')}
        onBulkEmail={() => handleBulkAction('Bulk email')}
      />
      )}

      {/* Advanced Filters Panel */}
      <AdvancedFilters isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={handleApplyFilters} currentFilters={filters} />

      {/* Modals */}
      {showMassEmail && (
        <MassEmailModal
          selectedCount={selectedLeads.length}
          isSending={isSending}
          onClose={() => { setShowMassEmail(false) }}
          onSend={handleSendMassEmail}
        />
      )}
      {showTagsModal && (
        <TagsModal
          onClose={() => setShowTagsModal(false)}
          onApply={handleApplyTags}
        />
      )}
      {showStatusModal && (
        <StatusModal onClose={() => setShowStatusModal(false)} onApply={handleStatusChange} />
      )}
      {showAssignModal && (
        <AssignModal teamMembers={teamMembers} onClose={() => setShowAssignModal(false)} onApply={handleAssignTo} />
      )}
      {showDeleteModal && (
        <BulkDeleteModal selectedCount={selectedLeads.length} onClose={() => setShowDeleteModal(false)} onDelete={handleBulkDelete} />
      )}
      {showPipelineModal && (
        <AlertDialog open={showPipelineModal} onOpenChange={setShowPipelineModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add to Pipeline</AlertDialogTitle>
              <AlertDialogDescription>
                Move {selectedLeads.length} selected lead{selectedLeads.length > 1 ? 's' : ''} to a pipeline stage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Pipeline</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedPipelineId}
                  onChange={(e) => { setSelectedPipelineId(e.target.value); setSelectedStageId('') }}
                >
                  <option value="">Select pipeline...</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedPipeline && (
                <div>
                  <label className="text-sm font-medium">Stage</label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                  >
                    <option value="">Select stage...</option>
                    {selectedPipeline.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowPipelineModal(false); setSelectedPipelineId(''); setSelectedStageId('') }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddToPipeline} disabled={!selectedPipelineId || !selectedStageId}>Add to Pipeline</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {showEditModal && editingLead && (
        <EditLeadModal
          editingLead={editingLead} editErrors={editErrors} teamMembers={teamMembers}
          onClose={() => { setShowEditModal(false); setEditingLead(null) }}
          onLeadChange={setEditingLead} onSave={handleSaveEdit}
        />
      )}

      {/* Fixed Top Section */}
      <div className="flex-shrink-0 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
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
              className="pl-9 pr-9"
            />
            {isFetching && searchQuery !== debouncedSearchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as ScoreFilterValue)}
              className="px-3 py-2 border rounded-md text-sm bg-background hover:bg-accent transition-colors"
            >
              <option value="ALL">All Scores</option>
              <option value="HOT">🔥 Hot (80-100)</option>
              <option value="WARM">🟡 Warm (50-79)</option>
              <option value="COOL">❄️ Cool (25-49)</option>
              <option value="COLD">⚫ Cold (0-24)</option>
            </select>
            <select
              value={filters.tags.length === 1 ? filters.tags[0] : ''}
              onChange={(e) => {
                const tag = e.target.value
                if (tag) {
                  setFilters(prev => ({ ...prev, tags: [tag] }))
                } else {
                  setFilters(prev => ({ ...prev, tags: [] }))
                }
              }}
              className="px-3 py-2 border rounded-md text-sm bg-background hover:bg-accent transition-colors"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
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
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-r-none border-r-0" title="Table View" aria-pressed={viewMode === 'table'} onClick={() => { setViewMode('table'); localStorage.setItem('leadsViewMode', 'table') }}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="rounded-none border-r-0" title="Grid View" aria-pressed={viewMode === 'grid'} onClick={() => { setViewMode('grid'); localStorage.setItem('leadsViewMode', 'grid') }}>
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

      {/* Save as Segment */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-1">
          {!showSaveSegment ? (
            <Button variant="outline" size="sm" onClick={() => setShowSaveSegment(true)}>
              <TagIcon className="mr-2 h-3.5 w-3.5" />
              Save as Segment
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Segment name..."
                value={saveSegmentName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveSegmentName(e.target.value)}
                className="h-8 w-48 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveAsSegment}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowSaveSegment(false); setSaveSegmentName('') }}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      {/* Saved Filter Views */}
      <div className="px-1">
        <SavedFilterViews
          currentFilters={filters} currentScoreFilter={scoreFilter}
          currentSortField={sortField} currentSortDirection={sortDirection ?? undefined}
          onLoadView={handleLoadSavedView} hasActiveFilters={hasActiveFilters}
        />
      </div>
      </div>{/* End fixed top section */}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 mt-4">

      {/* Leads Content */}
      {filteredAndSortedLeads.length === 0 ? (
        <Card className="p-12 bg-muted/50">
          <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Users className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-3">No leads yet</h2>
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
        </>
      )}

      </div>{/* End scrollable content area */}

      {/* Fixed Bottom: Pagination */}
      {filteredAndSortedLeads.length > 0 && (
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <select className="border rounded-md p-1 text-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-muted-foreground" aria-live="polite">
                per page • Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} results
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
        </div>
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
