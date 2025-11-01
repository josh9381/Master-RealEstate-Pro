import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/Dialog'
import { 
  Plus, Search, Filter, Download, LayoutGrid, LayoutList, MoreHorizontal,
  Mail, Tag as TagIcon, TrendingUp, Users, Target, ArrowUpDown, 
  ArrowUp, ArrowDown, ChevronDown, ChevronRight, FileText, Phone, 
  MessageSquare, X, Send
} from 'lucide-react'
import { AdvancedFilters } from '@/components/filters/AdvancedFilters'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips'
import { useToast } from '@/hooks/useToast'
import { leadsApi, CreateLeadData, UpdateLeadData, BulkUpdateData } from '@/lib/api'
import { Lead } from '@/types'
import { mockLeads } from '@/data/mockData'
import { MOCK_DATA_CONFIG } from '@/config/mockData.config'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

// Helper types for handling API data that might be objects
interface TagObject {
  id: number | string
  name: string
  color?: string
}

interface UserObject {
  id: number | string
  firstName: string
  lastName: string
  email?: string
  avatar?: string
}

interface FilterConfig {
  status: string[]
  source: string[]
  scoreRange: [number, number]
  dateRange: { from: string; to: string }
  tags: string[]
  assignedTo: string[]
}

type SortField = 'name' | 'company' | 'score' | 'status' | 'source' | 'createdAt'
type SortDirection = 'asc' | 'desc' | null

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
  const { toast } = useToast()

  // New modals for bulk actions
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRowMenu, setShowRowMenu] = useState<number | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  // Mass Email Modal State
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [emailErrors, setEmailErrors] = useState<{subject?: string; body?: string}>({})

  // Tags Modal State
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  
  // Bulk action state
  const [newStatus, setNewStatus] = useState('')
  const [assignToUser, setAssignToUser] = useState('')

  // Edit lead state - declared earlier with other state (line 63)

  // Fetch leads from API
  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', currentPage, pageSize, searchQuery, sortField, sortDirection, filters],
    queryFn: async () => {
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: pageSize,
          sortBy: sortField,
          sortOrder: sortDirection || 'desc',
        }
        
        if (searchQuery) params.search = searchQuery
        if (filters.status.length > 0) params.status = filters.status[0]
        if (filters.source.length > 0) params.source = filters.source[0]
        
        const response = await leadsApi.getLeads(params)
        return response.data
      } catch (error) {
        // If API fails (e.g., not authenticated), return null to use mock data
        console.log('API fetch failed, using mock data')
        return null
      }
    },
    retry: false, // Don't retry on auth failures
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })

  // Delete lead mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete lead')
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (leadIds: string[]) => leadsApi.bulkDelete(leadIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedLeads([])
      toast.success(`${selectedLeads.length} leads deleted`)
    },
    onError: () => {
      toast.error('Failed to delete leads')
    },
  })

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (leadData: CreateLeadData) => leadsApi.createLead(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully')
    },
    onError: () => {
      toast.error('Failed to create lead')
    },
  })

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) => 
      leadsApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead updated successfully')
    },
    onError: () => {
      toast.error('Failed to update lead')
    },
  })

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: BulkUpdateData) => 
      leadsApi.bulkUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedLeads([])
      toast.success(`${selectedLeads.length} leads updated`)
    },
    onError: () => {
      toast.error('Failed to update leads')
    },
  })

  // Extract leads data with fallback to mock data (if enabled)
  const leads = useMemo(() => {
    // If we have API data, use it
    if (leadsResponse?.leads && leadsResponse.leads.length > 0) {
      return leadsResponse.leads
    }
    // Otherwise, use mock data only if enabled
    if (MOCK_DATA_CONFIG.USE_MOCK_DATA) {
      return mockLeads as Lead[]
    }
    // Return empty array if mock data is disabled
    return []
  }, [leadsResponse])

  // Local state for lead notes
  const [leadNotes, setLeadNotes] = useState<Record<number, string[]>>({})

  // Calculate lead statistics (showing 0 for empty values)
  const leadStats = useMemo(() => {
    const total = leads.length || 0
    const qualified = leads.filter((l: Lead) => l.status === 'qualified').length || 0
    const avgScore = total > 0 ? Math.round(leads.reduce((sum: number, l: Lead) => sum + l.score, 0) / total) : 0
    const converted = leads.filter((l: Lead) => l.status === 'proposal' || l.status === 'negotiation').length || 0
    
    return {
      total,
      qualified,
      qualifiedRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
      avgScore,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0
    }
  }, [leads])

  // Calculate source distribution
  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {}
    leads.forEach((lead: Lead) => {
      sources[lead.source] = (sources[lead.source] || 0) + 1
    })
    return Object.entries(sources).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }))
  }, [leads])

  // Calculate score distribution
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

  // Filter and sort leads - server-side for API, client-side for mock
  const filteredAndSortedLeads = useMemo(() => {
    // If using API data (has pagination info), leads are already filtered/sorted
    if (leadsResponse?.pagination) {
      return leads
    }
    
    // Client-side filtering for mock data
    let filtered = leads.filter((lead: Lead) => {
      if (searchQuery && !lead.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !lead.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(lead.company || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })

    // Client-side sorting for mock data
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        const modifier = sortDirection === 'asc' ? 1 : -1
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * modifier
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier
        }
        return 0
      })
    }

    return filtered
  }, [leads, searchQuery, sortField, sortDirection, leadsResponse])

  // Paginate leads - server-side for API, client-side for mock
  const paginatedLeads = useMemo(() => {
    // If using API data, leads are already paginated
    if (leadsResponse?.pagination) {
      return leads
    }
    
    // Client-side pagination for mock data
    const startIndex = (currentPage - 1) * pageSize
    return filteredAndSortedLeads.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedLeads, currentPage, pageSize, leadsResponse, leads])

  // Get pagination info - from API or calculate for mock data
  const totalPages = leadsResponse?.pagination?.totalPages || Math.ceil(filteredAndSortedLeads.length / pageSize)
  const totalLeads = leadsResponse?.pagination?.total || filteredAndSortedLeads.length


  const toggleLeadSelection = (id: number) => {
    setSelectedLeads((prev: number[]) =>
      prev.includes(id) ? prev.filter((leadId: number) => leadId !== id) : [...prev, id]
    )
  }

  const toggleAllSelection = () => {
    if (selectedLeads.length === paginatedLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(paginatedLeads.map((lead: Lead) => lead.id))
    }
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3" />
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
  }

  const handleApplyFilters = (newFilters: FilterConfig) => {
    setFilters(newFilters)
    
    // Convert filters to chips
    const chips: Array<{ id: string; label: string; value: string }> = []
    
    newFilters.status.forEach((s, i) => chips.push({ id: `status-${i}`, label: 'Status', value: s }))
    newFilters.source.forEach((s, i) => chips.push({ id: `source-${i}`, label: 'Source', value: s }))
    newFilters.tags.forEach((t, i) => chips.push({ id: `tag-${i}`, label: 'Tag', value: t }))
    newFilters.assignedTo.forEach((a, i) => chips.push({ id: `assigned-${i}`, label: 'Assigned', value: a }))
    
    if (newFilters.scoreRange[0] > 0 || newFilters.scoreRange[1] < 100) {
      chips.push({ 
        id: 'score', 
        label: 'Score', 
        value: `${newFilters.scoreRange[0]}-${newFilters.scoreRange[1]}` 
      })
    }
    
    if (newFilters.dateRange.from || newFilters.dateRange.to) {
      chips.push({ 
        id: 'date', 
        label: 'Date', 
        value: `${newFilters.dateRange.from || '...'} to ${newFilters.dateRange.to || '...'}` 
      })
    }
    
    setActiveFilterChips(chips)
    setCurrentPage(1)
    toast.success('Filters applied successfully')
  }

  const handleRemoveChip = (chipId: string) => {
    setActiveFilterChips((prev: Array<{ id: string; label: string; value: string }>) => 
      prev.filter((c: { id: string; label: string; value: string }) => c.id !== chipId)
    )
  }

  const handleClearAllFilters = () => {
    setFilters({
      status: [],
      source: [],
      scoreRange: [0, 100],
      dateRange: { from: '', to: '' },
      tags: [],
      assignedTo: [],
    })
    setActiveFilterChips([])
  }

  const handleBulkAction = (action: string) => {
    if (action === 'Bulk email') {
      setShowMassEmail(true)
    } else if (action === 'Tags added') {
      setShowTagsModal(true)
    } else if (action === 'Status change') {
      setShowStatusModal(true)
    } else if (action === 'Assignment') {
      setShowAssignModal(true)
    } else if (action === 'Delete') {
      setShowDeleteModal(true)
    } else if (action === 'Export') {
      handleExportCSV()
    } else {
      toast.success(`${action} applied to ${selectedLeads.length} leads`)
      setSelectedLeads([])
    }
  }

  const handleSendMassEmail = () => {
    // Validate
    const errors: {subject?: string; body?: string} = {}
    if (!emailSubject.trim()) errors.subject = 'Subject is required'
    if (!emailBody.trim()) errors.body = 'Message is required'
    
    if (Object.keys(errors).length > 0) {
      setEmailErrors(errors)
      return
    }

    // Simulate sending
    setIsSending(true)
    setTimeout(() => {
      toast.success(`Email sent to ${selectedLeads.length} leads!`)
      setShowMassEmail(false)
      setEmailSubject('')
      setEmailBody('')
      setSelectedTemplate('')
      setEmailErrors({})
      setSelectedLeads([])
      setIsSending(false)
    }, 1500)
  }

  const handleApplyTags = () => {
    if (selectedTags.length === 0) {
      toast.error('Please select at least one tag')
      return
    }

    bulkUpdateMutation.mutate({
      leadIds: selectedLeads.map(String),
      updates: { tags: selectedTags }
    })
    setShowTagsModal(false)
    setSelectedTags([])
  }

  const handleAddQuickNote = (leadId: number) => {
    if (quickNote && quickNote.text.trim()) {
      setLeadNotes(prev => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), quickNote.text]
      }))
      toast.success('Note added successfully')
      setQuickNote(null)
    }
  }

  const handleStatusChange = () => {
    if (!newStatus) {
      toast.error('Please select a status')
      return
    }

    bulkUpdateMutation.mutate({
      leadIds: selectedLeads.map(String),
      updates: { status: newStatus as Lead['status'] }
    })
    setShowStatusModal(false)
    setNewStatus('')
  }

  const handleAssignTo = () => {
    if (!assignToUser) {
      toast.error('Please select a user')
      return
    }

    bulkUpdateMutation.mutate({
      leadIds: selectedLeads.map(String),
      updates: { assignedToId: assignToUser }
    })
    setShowAssignModal(false)
    setAssignToUser('')
  }

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedLeads.map(String))
    setShowDeleteModal(false)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (editingLead) {
      // Filter out null values and convert to UpdateLeadData
      const updateData: UpdateLeadData = {
        name: editingLead.name,
        email: editingLead.email,
        phone: editingLead.phone,
        company: editingLead.company,
        status: editingLead.status,
        source: editingLead.source,
        score: editingLead.score,
        assignedToId: editingLead.assignedTo || undefined,
        tags: editingLead.tags,
      }
      
      updateLeadMutation.mutate({
        id: String(editingLead.id),
        data: updateData
      })
      setShowEditModal(false)
      setEditingLead(null)
    }
  }

  const handleDuplicateLead = (lead: Lead) => {
    // Create a copy of the lead without the ID
    const createData: CreateLeadData = {
      name: `${lead.name} (Copy)`,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      source: lead.source,
      assignedToId: lead.assignedTo || undefined,
      tags: lead.tags,
    }
    createLeadMutation.mutate(createData)
  }

  const handleDeleteSingle = (leadId: number) => {
    setDeletingLeadId(leadId)
    setShowDeleteConfirm(true)
    setShowRowMenu(null)
  }

  const confirmDelete = () => {
    if (deletingLeadId) {
      deleteMutation.mutate(String(deletingLeadId))
      setShowDeleteConfirm(false)
      setDeletingLeadId(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingLeadId(null)
  }

  const handleExportCSV = () => {
    const selectedLeadsData = leads.filter((l: Lead) => selectedLeads.includes(l.id))
    const data = selectedLeadsData.length > 0 ? selectedLeadsData : filteredAndSortedLeads
    
    const csvContent = [
      ['Name', 'Email', 'Company', 'Phone', 'Score', 'Status', 'Source', 'Assigned To', 'Tags'],
      ...data.map((lead: Lead) => [
        lead.name,
        lead.email,
        lead.company,
        lead.phone,
        lead.score.toString(),
        lead.status,
        lead.source,
        lead.assignedTo || 'Unassigned',
        (lead.tags || []).join('; ')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success(`Exported ${data.length} leads to CSV`)
    setSelectedLeads([])
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'qualified': return 'success'
      case 'contacted': return 'warning'
      case 'new': return 'secondary'
      case 'proposal': return 'default'
      case 'negotiation': return 'default'
      default: return 'secondary'
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

  const getRecentActivities = (leadId: number) => {
    // TODO: Fetch activities from API for this lead
    // For now, just return notes from local state
    const notes = (leadNotes[leadId] || []).map((note) => ({
      type: 'note',
      desc: note,
      time: 'Just now',
      details: ''
    }))

    return notes
  }

  // Commented out for now - will be used when we fetch activities from API
  /*
  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`
    return then.toLocaleDateString()
  }
  */

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-24 animate-pulse bg-muted rounded" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="h-96 animate-pulse bg-muted rounded" />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
              <h3 className="mt-2 text-3xl font-bold">{totalLeads || leadStats.total}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Showing page {currentPage} of {totalPages}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Qualified Rate</p>
              <h3 className="mt-2 text-3xl font-bold">{leadStats.qualifiedRate}%</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">↑ 5%</span> from last month
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Lead Score</p>
              <h3 className="mt-2 text-3xl font-bold">{leadStats.avgScore}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-red-600 font-medium">↓ 2%</span> from last month
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
              <h3 className="mt-2 text-3xl font-bold">{leadStats.conversionRate}%</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">↑ 8%</span> from last month
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Source Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Score Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Number of Leads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedLeads.length}
        onClearSelection={() => setSelectedLeads([])}
        onChangeStatus={() => handleBulkAction('Status change')}
        onAddTags={() => handleBulkAction('Tags added')}
        onAssignTo={() => handleBulkAction('Assignment')}
        onExport={() => handleBulkAction('Export')}
        onDelete={() => handleBulkAction('Delete')}
        onBulkEmail={() => handleBulkAction('Bulk email')}
      />

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Mass Email Modal */}
      {showMassEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Send Mass Email</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMassEmail(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template (Optional)</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  <option value="welcome">Welcome Email</option>
                  <option value="followup">Follow-up Email</option>
                  <option value="proposal">Proposal Email</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Subject *</label>
                <Input
                  placeholder="Email subject..."
                  value={emailSubject}
                  onChange={(e) => {
                    setEmailSubject(e.target.value)
                    if (emailErrors.subject) setEmailErrors(prev => ({ ...prev, subject: undefined }))
                  }}
                  className={`mt-1 ${emailErrors.subject ? 'border-red-500' : ''}`}
                />
                {emailErrors.subject && (
                  <p className="text-xs text-red-500 mt-1">{emailErrors.subject}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Message *</label>
                <textarea
                  className={`w-full mt-1 p-2 border rounded-md min-h-[200px] ${emailErrors.body ? 'border-red-500' : ''}`}
                  placeholder="Email body..."
                  value={emailBody}
                  onChange={(e) => {
                    setEmailBody(e.target.value)
                    if (emailErrors.body) setEmailErrors(prev => ({ ...prev, body: undefined }))
                  }}
                />
                {emailErrors.body && (
                  <p className="text-xs text-red-500 mt-1">{emailErrors.body}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Sending to {selectedLeads.length} leads
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowMassEmail(false)
                    setEmailErrors({})
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMassEmail} disabled={isSending}>
                    {isSending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tags Modal */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Tags</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTagsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Hot Lead', 'Enterprise', 'VIP', 'Follow-up', 'Demo Scheduled', 'Proposal Sent'].map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        )
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Add New Tag</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Tag name..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (newTag.trim()) {
                        setSelectedTags(prev => [...prev, newTag.trim()])
                        setNewTag('')
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowTagsModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplyTags} disabled={selectedTags.length === 0}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  Apply Tags
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Change Status</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowStatusModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Status</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select status...</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusChange}>
                  Update Status
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Assign To Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Assign Leads</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAssignModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={assignToUser}
                  onChange={(e) => setAssignToUser(e.target.value)}
                >
                  <option value="">Select user...</option>
                  <option value="Sarah Johnson">Sarah Johnson</option>
                  <option value="Mike Chen">Mike Chen</option>
                  <option value="David Lee">David Lee</option>
                  <option value="Emma Rodriguez">Emma Rodriguez</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignTo}>
                  Assign Leads
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600">Delete Leads</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm">
                Are you sure you want to delete {selectedLeads.length} lead(s)? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete}>
                  Delete Leads
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Edit Lead</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowEditModal(false)
                setEditingLead(null)
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      value={editingLead.name}
                      onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                      className="mt-1"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Position/Title</label>
                    <Input
                      value={editingLead.position || ''}
                      onChange={(e) => setEditingLead({...editingLead, position: e.target.value})}
                      className="mt-1"
                      placeholder="CEO, Manager, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                      className="mt-1"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editingLead.phone}
                      onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                      className="mt-1"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      value={editingLead.company}
                      onChange={(e) => setEditingLead({...editingLead, company: e.target.value})}
                      className="mt-1"
                      placeholder="Acme Inc"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={editingLead.customFields?.industry || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead, 
                        customFields: {...editingLead.customFields, industry: e.target.value}
                      })}
                      className="mt-1"
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company Size</label>
                    <Input
                      type="number"
                      value={editingLead.customFields?.companySize || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, companySize: parseInt(e.target.value) || 0}
                      })}
                      className="mt-1"
                      placeholder="Number of employees"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={editingLead.customFields?.website || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, website: e.target.value}
                      })}
                      className="mt-1"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Street Address</label>
                    <Input
                      value={editingLead.customFields?.address?.street || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, street: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={editingLead.customFields?.address?.city || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, city: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State/Province</label>
                    <Input
                      value={editingLead.customFields?.address?.state || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, state: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP/Postal Code</label>
                    <Input
                      value={editingLead.customFields?.address?.zip || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, zip: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="10001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={editingLead.customFields?.address?.country || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, country: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.status}
                      onChange={(e) => setEditingLead({...editingLead, status: e.target.value as Lead['status']})}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md capitalize"
                      value={editingLead.source}
                      onChange={(e) => setEditingLead({...editingLead, source: e.target.value})}
                    >
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="social">Social Media</option>
                      <option value="email">Email Campaign</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="event">Event</option>
                      <option value="partner">Partner</option>
                      <option value="cold_call">Cold Call</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lead Score (0-100)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingLead.score}
                      onChange={(e) => setEditingLead({...editingLead, score: parseInt(e.target.value) || 0})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.assignedTo || ''}
                      onChange={(e) => setEditingLead({...editingLead, assignedTo: e.target.value || null})}
                    >
                      <option value="">Unassigned</option>
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Mike Chen">Mike Chen</option>
                      <option value="David Lee">David Lee</option>
                      <option value="Emma Rodriguez">Emma Rodriguez</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deal Value ($)</label>
                    <Input
                      type="number"
                      value={editingLead.value || ''}
                      onChange={(e) => setEditingLead({...editingLead, value: parseInt(e.target.value) || 0})}
                      className="mt-1"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget ($)</label>
                    <Input
                      type="number"
                      value={editingLead.customFields?.budget || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, budget: parseInt(e.target.value) || 0}
                      })}
                      className="mt-1"
                      placeholder="75000"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md min-h-[100px]"
                  value={typeof editingLead.notes === 'string' ? editingLead.notes : ''}
                  onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                  placeholder="Add any additional notes about this lead..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowEditModal(false)
                  setEditingLead(null)
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <FileText className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and track all your leads in one place
          </p>
        </div>
        <Link to="/leads/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </Link>
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
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none border-r-0"
                title="Table View"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-r-0"
                title="Grid View"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Link to="/leads/pipeline">
                <Button
                  variant={'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  title="Pipeline View"
                >
                  <LayoutGrid className="h-4 w-4 rotate-45" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        chips={activeFilterChips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAllFilters}
        resultCount={filteredAndSortedLeads.length}
      />

      {/* Leads Table or Grid */}
      {viewMode === 'table' ? (
        <Card>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                  onChange={toggleAllSelection}
                  className="rounded"
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center">
                  Name
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('company')}>
                <div className="flex items-center">
                  Company
                  {getSortIcon('company')}
                </div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('score')}>
                <div className="flex items-center">
                  Score
                  {getSortIcon('score')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('source')}>
                <div className="flex items-center">
                  Source
                  {getSortIcon('source')}
                </div>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead: Lead) => (
              <React.Fragment key={lead.id}>
                <TableRow>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                    >
                      {expandedRow === lead.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/leads/${lead.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell>
                    <Badge variant={lead.score >= 80 ? 'success' : 'secondary'}>
                      {lead.score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
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
                  </TableCell>
                  <TableCell>
                    {(() => {
                      if (typeof lead.assignedTo === 'string') {
                        return lead.assignedTo
                      }
                      if (lead.assignedTo && typeof lead.assignedTo === 'object' && 'firstName' in lead.assignedTo) {
                        const user = lead.assignedTo as UserObject
                        return `${user.firstName} ${user.lastName}`
                      }
                      return '-'
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowRowMenu(showRowMenu === lead.id ? null : lead.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      
                      {showRowMenu === lead.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-50">
                          <div className="py-1">
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                handleEditLead(lead)
                                setShowRowMenu(null)
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                handleDuplicateLead(lead)
                                setShowRowMenu(null)
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              Duplicate
                            </button>
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                setSelectedLeads([lead.id])
                                setShowMassEmail(true)
                                setShowRowMenu(null)
                              }}
                            >
                              <Mail className="h-4 w-4" />
                              Send Email
                            </button>
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => {
                                toast.success('Call initiated')
                                setShowRowMenu(null)
                              }}
                            >
                              <Phone className="h-4 w-4" />
                              Call
                            </button>
                            <div className="border-t my-1"></div>
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => {
                                handleDeleteSingle(lead.id)
                                setShowRowMenu(null)
                              }}
                            >
                              <X className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
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
                          {getRecentActivities(lead.id).map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <div className="mt-1">
                                {activity.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                                {activity.type === 'call' && <Phone className="h-4 w-4 text-green-600" />}
                                {activity.type === 'note' && <FileText className="h-4 w-4 text-orange-600" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{activity.desc}</p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Note */}
                        <div className="pt-3 border-t">
                          <div className="flex gap-2">
                            {quickNote?.leadId === lead.id ? (
                              <>
                                <Input
                                  placeholder="Add a quick note..."
                                  value={quickNote?.text || ''}
                                  onChange={(e) => setQuickNote({ leadId: lead.id, text: e.target.value })}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleAddQuickNote(lead.id)
                                  }}
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleAddQuickNote(lead.id)}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setQuickNote(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQuickNote({ leadId: lead.id, text: '' })}
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
      </Card>
      ) : (
        /* Grid View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedLeads.map((lead: Lead) => (
            <Card key={lead.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={() => toggleLeadSelection(lead.id)}
                  className="rounded mt-1"
                />
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowRowMenu(showRowMenu === lead.id ? null : lead.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showRowMenu === lead.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-50">
                      <div className="py-1">
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            handleEditLead(lead)
                            setShowRowMenu(null)
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            handleDuplicateLead(lead)
                            setShowRowMenu(null)
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          Duplicate
                        </button>
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            setSelectedLeads([lead.id])
                            setShowMassEmail(true)
                            setShowRowMenu(null)
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          Send Email
                        </button>
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => {
                            toast.success('Call initiated')
                            setShowRowMenu(null)
                          }}
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </button>
                        <div className="border-t my-1"></div>
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                          onClick={() => {
                            handleDeleteSingle(lead.id)
                            setShowRowMenu(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Link to={`/leads/${lead.id}`} className="block mb-3">
                <h3 className="font-semibold text-lg hover:text-primary">{lead.name}</h3>
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
                <Badge variant={lead.score >= 80 ? 'success' : 'secondary'}>
                  Score: {lead.score}
                </Badge>
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
                <span className="text-muted-foreground">
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
      )}

      {/* Pagination (shared for both views) */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <select
              className="border rounded-md p-1 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2
              if (pageNum > totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <Button variant="ghost" size="sm" disabled>
                  ...
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

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
            <AlertDialogCancel variant="outline" onClick={cancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
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
