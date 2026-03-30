import { logger } from '@/lib/logger'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { LINE_CHART_COLORS } from '@/lib/chartColors'
import {
  Plus, Mail, MessageSquare, Phone, MoreHorizontal, Search,
  TrendingUp, DollarSign, Users, Target, Calendar as CalendarIcon,
  LayoutGrid, Download, Share2, BarChart3, LayoutList,
  Copy, ClipboardList, Tag,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav'
import { CampaignRowMenu } from '@/components/campaigns/CampaignRowMenu'
import type { CampaignRowMenuActions } from '@/components/campaigns/CampaignRowMenu'
import { getStatusVariant } from '@/lib/campaignUtils'
import { Campaign } from '@/types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/hooks/useToast'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { campaignsApi, CampaignsQuery } from '@/lib/api'
import { exportToCSV, campaignExportColumns } from '@/lib/exportService'
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate'
import { calcROI, calcOpenRate, calcClickRate, formatRate, calcRate, calcProgress, fmtMoney } from '@/lib/metricsCalculator'
type CampaignType = 'all' | 'EMAIL' | 'SMS' | 'PHONE'

function CampaignsList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // P1 #5: Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const typeFilter = (searchParams.get('type')?.toUpperCase() || 'all') as CampaignType
  const setTypeFilter = (type: CampaignType) => {
    if (type === 'all') {
      searchParams.delete('type')
    } else {
      searchParams.set('type', type.toLowerCase())
    }
    setSearchParams(searchParams, { replace: true })
  }
  const [activeTab, setActiveTab] = useState<'all' | 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showRowMenu, setShowRowMenu] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<Campaign['status'] | undefined>(undefined)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<string | null>(null)

  // P0 #1: Close row menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showRowMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRowMenu(null)
      }
    }
    if (showRowMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRowMenu])

  // Fetch campaigns from API with server-side pagination
  const { data: campaignsResponse, isLoading, isError } = useQuery({
    queryKey: ['campaigns', debouncedSearch, activeTab, typeFilter, currentPage],
    queryFn: async () => {
      try {
        const params: CampaignsQuery = {
          page: currentPage,
          limit: pageSize,
        }
        if (debouncedSearch) params.search = debouncedSearch
        if (activeTab !== 'all') params.status = activeTab
        if (typeFilter !== 'all') params.type = typeFilter as CampaignsQuery['type']
        
        const response = await campaignsApi.getCampaigns(params)
        return response.data
      } catch (error) {
        logger.error('Failed to fetch campaigns:', error)
        throw error
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Separate query for dashboard stats — cached longer to avoid redundant API calls
  const { data: statsResponse } = useQuery({
    queryKey: ['campaigns-stats-all', typeFilter],
    queryFn: async () => {
      const params: CampaignsQuery = { page: 1, limit: 200 }
      if (typeFilter !== 'all') params.type = typeFilter as CampaignsQuery['type']
      const response = await campaignsApi.getCampaigns(params)
      return response.data
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000, // Cache for 1 minute to avoid double-fetching
  })

  const campaigns = useMemo(() => {
    if (campaignsResponse?.campaigns && campaignsResponse.campaigns.length > 0) {
      return campaignsResponse.campaigns as Campaign[]
    }
    return []
  }, [campaignsResponse])

  const allCampaignsForStats = useMemo(() => {
    if (statsResponse?.campaigns && statsResponse.campaigns.length > 0) {
      return statsResponse.campaigns as Campaign[]
    }
    return campaigns
  }, [statsResponse, campaigns])



  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete campaign')
    },
  })

  // Pause campaign mutation
  const pauseCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.pauseCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign paused successfully')
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to pause campaign')
    },
  })

  // Send campaign mutation (with large campaign confirmation support)
  const sendCampaignMutation = useMutation({
    mutationFn: ({ id, confirmLargeSend }: { id: string; confirmLargeSend?: boolean }) =>
      campaignsApi.sendCampaign(id, { confirmLargeSend }),
    onSuccess: (data, variables) => {
      if (data?.requiresConfirmation) {
        // Large campaign - ask user to confirm
        const confirmed = window.confirm(data.message);
        if (confirmed) {
          sendCampaignMutation.mutate({ id: variables.id, confirmLargeSend: true });
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign sent successfully')
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to send campaign')
    },
  })

  // Resume campaign mutation (update status to ACTIVE)
  const resumeCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.updateCampaign(id, { status: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign resumed successfully')
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to resume campaign')
    },
  })



  // Server-side pagination: campaigns are already filtered by the API
  const filteredCampaigns = campaigns

  // Use server-side pagination info
  const totalPages = campaignsResponse?.pagination?.totalPages || Math.max(1, Math.ceil(campaigns.length / pageSize))
  const paginatedCampaigns = campaigns // Already paginated by server

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, activeTab, typeFilter])

  // Calculate statistics — use full dataset for accurate stats
  const stats = useMemo(() => {
    const base = typeFilter === 'all' ? allCampaignsForStats : allCampaignsForStats.filter(c => (c.type || '').toUpperCase() === typeFilter)
    const activeCampaigns = base.filter(c => c.status === 'ACTIVE')
    const totalSent = base.reduce((sum, c) => sum + (c.sent ?? 0), 0)
    const totalRevenue = base.reduce((sum, c) => sum + (c.revenue ?? 0), 0)
    const totalSpent = base.reduce((sum, c) => sum + (c.spent ?? 0), 0)
    const avgROI = totalSpent > 0 ? formatRate(calcROI(totalRevenue, totalSpent)) : '0'

    return {
      active: activeCampaigns.length,
      totalSent,
      totalRevenue,
      avgROI,
      totalBudget: base.reduce((sum, c) => sum + (c.budget ?? 0), 0),
      totalSpent
    }
  }, [allCampaignsForStats, typeFilter])

  // Performance by type — use full dataset
  const performanceByType = useMemo(() => {
    const types = typeFilter === 'all' ? ['EMAIL', 'SMS', 'PHONE', 'SOCIAL'] : [typeFilter]
    return types.map(type => {
      const typeCampaigns = allCampaignsForStats.filter(c => (c.type || '').toUpperCase() === type)
      const revenue = typeCampaigns.reduce((sum, c) => sum + (c.revenue ?? 0), 0)
      const spent = typeCampaigns.reduce((sum, c) => sum + (c.spent ?? 0), 0)
      return {
        type: type.charAt(0) + type.slice(1).toLowerCase(),
        campaigns: typeCampaigns.length,
        revenue,
        spent,
        roi: calcROI(revenue, spent)
      }
    })
  }, [allCampaignsForStats, typeFilter])

  // Calendar data
  // getStatusVariant imported from @/lib/campaignUtils

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email': return <Mail className="h-5 w-5" />
      case 'sms': return <MessageSquare className="h-5 w-5" />
      case 'phone': return <Phone className="h-5 w-5" />
      case 'social': return <Share2 className="h-5 w-5" />
      default: return null
    }
  }

  const toggleCampaignSelection = (id: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    )
  }

  // Handler functions
  const handleStatusChange = async () => {
    if (!newStatus) {
      toast.error('Please select a status')
      return
    }

    // P1 #4: Batch status changes with Promise.allSettled using direct API calls
    const results = await Promise.allSettled(
      selectedCampaigns.map(campaignId =>
        campaignsApi.updateCampaign(
          String(campaignId),
          { status: newStatus.toUpperCase() as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' }
        )
      )
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      toast.error(`Failed to update ${failed} of ${selectedCampaigns.length} campaigns`)
    }
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })

    setShowStatusModal(false)
    setNewStatus(undefined)
    setSelectedCampaigns([])
  }

  const handleBulkDelete = async () => {
    // P1 #4: Batch delete with Promise.allSettled using direct API calls
    const results = await Promise.allSettled(
      selectedCampaigns.map(campaignId =>
        campaignsApi.deleteCampaign(String(campaignId))
      )
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} of ${selectedCampaigns.length} campaigns`)
    }
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })

    setShowDeleteModal(false)
    setSelectedCampaigns([])
  }

  const handleDeleteSingle = (id: string) => {
    // Use API if we have real campaigns
    if (campaignsResponse?.campaigns) {
      deleteCampaignMutation.mutate(String(id))
    }

    setShowDeleteModal(false)
    setCampaignToDelete(null)
    setShowRowMenu(null)
  }

  // Duplicate campaign mutation
  const duplicateCampaignMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => 
      campaignsApi.duplicateCampaign(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign duplicated successfully')
      setShowDuplicateModal(false)
      setCampaignToDuplicate(null)
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to duplicate campaign')
    },
  })

  // Archive campaign mutation
  const archiveCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.archiveCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign archived successfully')
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to archive campaign')
    },
  })

  // Unarchive campaign mutation
  const unarchiveCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.unarchiveCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign unarchived successfully')
      setShowRowMenu(null)
    },
    onError: () => {
      toast.error('Failed to unarchive campaign')
    },
  })

  const handleDuplicateCampaign = () => {
    if (!campaignToDuplicate) return

    const originalCampaign = campaigns.find(c => c.id === campaignToDuplicate)
    if (!originalCampaign) return

    // Use the proper duplicate API endpoint
    duplicateCampaignMutation.mutate({
      id: String(originalCampaign.id),
      name: `${originalCampaign.name} (Copy)`,
    })
  }

  const handleExportCSV = () => {
    const selectedCampaignsData = selectedCampaigns.length > 0
      ? campaigns.filter(c => selectedCampaigns.includes(String(c.id)))
      : campaigns

    exportToCSV(selectedCampaignsData, campaignExportColumns, {
      filename: `campaigns-${new Date().toISOString().split('T')[0]}`,
    })

    toast.success(`Exported ${selectedCampaignsData.length} campaign(s)`)
  }

  const COLORS = LINE_CHART_COLORS

  // Shared row menu actions for CampaignRowMenu component
  const rowMenuActions: CampaignRowMenuActions = {
    onDuplicate: (id) => {
      setCampaignToDuplicate(id)
      setShowDuplicateModal(true)
      setShowRowMenu(null)
    },
    onPause: (id) => pauseCampaignMutation.mutate(id),
    onResume: (id) => resumeCampaignMutation.mutate(id),
    onSend: (id) => sendCampaignMutation.mutate({ id }),
    onArchive: (id) => archiveCampaignMutation.mutate(id),
    onUnarchive: (id) => unarchiveCampaignMutation.mutate(id),
    onChangeStatus: (id) => {
      setSelectedCampaigns([id])
      setShowStatusModal(true)
      setShowRowMenu(null)
    },
    onDelete: (id) => {
      setCampaignToDelete(id)
      setShowDeleteModal(true)
      setShowRowMenu(null)
    },
    isPausePending: pauseCampaignMutation.isPending,
    isResumePending: resumeCampaignMutation.isPending,
    isSendPending: sendCampaignMutation.isPending,
    isArchivePending: archiveCampaignMutation.isPending,
    isUnarchivePending: unarchiveCampaignMutation.isPending,
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-1/3 mb-2" />
          <div className="h-6 bg-muted rounded w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <CampaignsSubNav campaigns={allCampaignsForStats} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">Failed to load campaigns</p>
            <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav campaigns={allCampaignsForStats} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} />



      {/* Phone Coming Soon Banner */}
      {typeFilter === 'PHONE' && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-8 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-2">
            Coming Soon
          </span>
          <p className="text-sm text-amber-700">
            Voice telephony integration is on the roadmap. Use Email or SMS campaigns in the meantime.
          </p>
        </div>
      )}

      {typeFilter !== 'PHONE' && (<>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-2 text-muted-foreground">
            Create and manage your marketing campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UsageBadge resource="campaigns" />
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <FeatureGate resource="campaigns">
            <Link to="/campaigns/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </FeatureGate>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCampaigns.length}
        onClearSelection={() => setSelectedCampaigns([])}
        onChangeStatus={(_status) => setShowStatusModal(true)}
        onExport={handleExportCSV}
        onDelete={() => setShowDeleteModal(true)}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <div className="rounded-full bg-blue-100 p-2.5">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.active}</div>
            <p className="mt-1 text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <div className="rounded-full bg-green-100 p-2.5">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="rounded-full bg-purple-100 p-2.5">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmtMoney(stats.totalRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total generated</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <div className="rounded-full bg-orange-100 p-2.5">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgROI}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Spent Tracker */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{fmtMoney(stats.totalBudget)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Spent</p>
                <p className="text-2xl font-bold">{fmtMoney(stats.totalSpent)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-green-600">{fmtMoney(stats.totalBudget - stats.totalSpent)}</p>
              </div>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${calcProgress(stats.totalSpent, stats.totalBudget)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatRate(calcRate(stats.totalSpent, stats.totalBudget))}% of budget used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance by Type Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Performance by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByType}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="type" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                <Bar yAxisId="right" dataKey="campaigns" fill="#10b981" name="# Campaigns" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, revenue }) => `${type}: ${fmtMoney(revenue)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {performanceByType.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => fmtMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCampaigns.length > 1 && (
            <Button variant="outline" onClick={() => setShowComparison(!showComparison)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Compare ({selectedCampaigns.length})
            </Button>
          )}
          <div className="flex items-center rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
              aria-label="Calendar view"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b">
        {(['all', 'DRAFT', 'ACTIVE', 'SCHEDULED', 'SENDING', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const).map(tab => {
          const typeFiltered = typeFilter === 'all' ? campaigns : campaigns.filter(c => (c.type || '').toUpperCase() === typeFilter)
          const count = tab === 'all' 
            ? typeFiltered.length 
            : typeFiltered.filter(c => c.status.toUpperCase() === tab).length
          return (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && !isLoading && viewMode !== 'calendar' && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Target className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns found'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {campaigns.length === 0 
                ? 'Get started by creating your first campaign to reach your audience.'
                : activeTab === 'all'
                ? 'No campaigns match your search criteria. Try adjusting your filters.'
                : `No ${activeTab.toLowerCase()} campaigns found. Try a different filter.`
              }
            </p>
            {campaigns.length === 0 && (
              <FeatureGate resource="campaigns">
                <Link to="/campaigns/create">
                  <Button size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Button>
                </Link>
              </FeatureGate>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-Campaign Comparison */}
      {showComparison && selectedCampaigns.length <= 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Comparison</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Select at least 2 campaigns to compare their performance.
            </p>
          </CardContent>
        </Card>
      )}
      {showComparison && selectedCampaigns.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Comparison</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-sm font-medium">Campaign</th>
                    <th className="pb-2 text-right text-sm font-medium">Type</th>
                    <th className="pb-2 text-right text-sm font-medium">Sent</th>
                    <th className="pb-2 text-right text-sm font-medium">Opens</th>
                    <th className="pb-2 text-right text-sm font-medium">Clicks</th>
                    <th className="pb-2 text-right text-sm font-medium">Conversions</th>
                    <th className="pb-2 text-right text-sm font-medium">Revenue</th>
                    <th className="pb-2 text-right text-sm font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCampaigns.map(id => {
                    const campaign = campaigns.find(c => c.id === id)
                    if (!campaign) return null
                    return (
                      <tr key={id} className="border-b">
                        <td className="py-2 text-sm">{campaign.name}</td>
                        <td className="py-2 text-right text-sm capitalize">{campaign.type}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent ? (campaign.sent).toLocaleString() : '—'}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent ? (campaign.opened ?? 0).toLocaleString() : '—'}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent ? (campaign.clicked ?? 0).toLocaleString() : '—'}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent ? (campaign.converted ?? 0).toLocaleString() : '—'}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent ? fmtMoney(campaign.revenue ?? 0) : '—'}</td>
                        <td className="py-2 text-right text-sm font-medium">{campaign.sent ? `${formatRate(calcROI(campaign.revenue ?? 0, campaign.spent ?? 0))}%` : 'N/A'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List View */}
      {viewMode === 'list' && filteredCampaigns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <input
              type="checkbox"
              checked={filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedCampaigns.includes(String(c.id)))}
              onChange={() => {
                const allIds = filteredCampaigns.map(c => String(c.id))
                const allSelected = allIds.every(id => selectedCampaigns.includes(id))
                setSelectedCampaigns(allSelected ? selectedCampaigns.filter(id => !allIds.includes(id)) : [...new Set([...selectedCampaigns, ...allIds])])
              }}
              className="rounded"
            />
            <span className="text-sm text-muted-foreground">
              {selectedCampaigns.length > 0 ? `${selectedCampaigns.length} selected` : 'Select all'}
            </span>
          </div>
          {paginatedCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg hover:border-primary/30 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(String(campaign.id))}
                      onChange={() => toggleCampaignSelection(String(campaign.id))}
                      className="rounded"
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {getTypeIcon(campaign.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        <Link to={`/campaigns/${campaign.id}`} className="hover:text-primary">
                          {campaign.name}
                        </Link>
                      </CardTitle>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge variant={getStatusVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Started {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                        {campaign.abTest && (
                          <Badge variant="outline" className="text-xs">
                            {campaign.abTest.winner ? `A/B Test - Winner: ${campaign.abTest.winner}` : 'A/B Test'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative" ref={showRowMenu === String(campaign.id) ? menuRef : undefined}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowRowMenu(showRowMenu === String(campaign.id) ? null : String(campaign.id))}
                      aria-label="Campaign actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showRowMenu === String(campaign.id) && (
                      <CampaignRowMenu campaign={campaign} actions={rowMenuActions} />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold">{(campaign.sent ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-2xl font-bold">{(campaign.opened ?? 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.opened && (
                      <p className="text-xs text-muted-foreground">
                        {formatRate(calcOpenRate(campaign.opened, campaign.sent))}%
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clicked</p>
                    <p className="text-2xl font-bold">{(campaign.clicked ?? 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.clicked && (
                      <p className="text-xs text-muted-foreground">
                        {formatRate(calcClickRate(campaign.clicked, campaign.sent))}%
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold">{campaign.sent ? `${formatRate(calcROI(campaign.revenue ?? 0, campaign.spent ?? 0))}%` : 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtMoney(campaign.revenue ?? 0)} revenue
                    </p>
                  </div>
                </div>
                {campaign.budget && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Budget: {fmtMoney(campaign.budget)}</span>
                      <span>Spent: {fmtMoney(campaign.spent ?? 0)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${calcProgress(campaign.spent ?? 0, campaign.budget)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Grid View */}
      {viewMode === 'grid' && filteredCampaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="flex flex-col hover:shadow-lg hover:border-primary/30 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/50"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/campaigns/${campaign.id}`; }}
              role="article"
              aria-label={`Campaign: ${campaign.name}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(String(campaign.id))}
                    onChange={() => toggleCampaignSelection(String(campaign.id))}
                    className="rounded"
                  />
                  <div className="relative" ref={showRowMenu === String(campaign.id) ? menuRef : undefined}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowRowMenu(showRowMenu === String(campaign.id) ? null : String(campaign.id))}
                      aria-label="Campaign actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showRowMenu === String(campaign.id) && (
                      <CampaignRowMenu campaign={campaign} actions={rowMenuActions} />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {getTypeIcon(campaign.type)}
                  </div>
                </div>
                <CardTitle className="text-center text-lg line-clamp-2">
                  <Link to={`/campaigns/${campaign.id}`} className="hover:text-primary">
                    {campaign.name}
                  </Link>
                </CardTitle>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <Badge variant={getStatusVariant(campaign.status)} className="text-xs">
                    {campaign.status}
                  </Badge>
                  {campaign.abTest && (
                    <Badge variant="outline" className="text-xs">
                      A/B Test
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sent</span>
                    <span className="font-bold">{(campaign.sent ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Opens</span>
                    <div className="text-right">
                      <span className="font-bold">{(campaign.opened ?? 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.opened && (
                        <p className="text-xs text-muted-foreground">
                          {formatRate(calcOpenRate(campaign.opened, campaign.sent))}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <div className="text-right">
                      <span className="font-bold">{(campaign.clicked ?? 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.clicked && (
                        <p className="text-xs text-muted-foreground">
                          {formatRate(calcClickRate(campaign.clicked, campaign.sent))}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">ROI</span>
                      <span className="text-lg font-bold text-green-600">{campaign.sent ? `${formatRate(calcROI(campaign.revenue ?? 0, campaign.spent ?? 0))}%` : 'N/A'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {fmtMoney(campaign.revenue ?? 0)} revenue
                    </p>
                  </div>
                  {campaign.budget && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Budget</span>
                        <span>{fmtMoney(campaign.spent ?? 0)} / {fmtMoney(campaign.budget)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${calcProgress(campaign.spent ?? 0, campaign.budget)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Started {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {(viewMode === 'list' || viewMode === 'grid') && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={currentPage === p ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (() => {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth()
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const campaignsByDay: Record<number, Campaign[]> = {}
        filteredCampaigns.forEach(c => {
          if (!c.startDate) return
          const d = new Date(c.startDate)
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate()
            if (!campaignsByDay[day]) campaignsByDay[day] = []
            campaignsByDay[day].push(c)
          }
        })
        const today = new Date()
        const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
        const hasCampaignsThisMonth = Object.keys(campaignsByDay).length > 0

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campaign Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
                    Today
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {dayNames.map(d => (
                  <div key={d} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} className="bg-background p-2 min-h-[80px]" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <div
                    key={day}
                    className={`bg-background p-2 min-h-[80px] ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                    <div className="mt-1 space-y-1">
                      {(campaignsByDay[day] || []).slice(0, 3).map(c => (
                        <Link key={c.id} to={`/campaigns/${c.id}`}>
                          <div
                            className="text-[10px] leading-tight truncate rounded px-1 py-0.5 cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: c.status === 'ACTIVE' ? '#dcfce7' : c.status === 'SCHEDULED' ? '#fef3c7' : c.status === 'PAUSED' ? '#e5e7eb' : '#dbeafe',
                              color: c.status === 'ACTIVE' ? '#166534' : c.status === 'SCHEDULED' ? '#92400e' : c.status === 'PAUSED' ? '#374151' : '#1e40af',
                            }}
                            title={`${c.name} (${c.status})`}
                          >
                            {c.name}
                          </div>
                        </Link>
                      ))}
                      {(campaignsByDay[day] || []).length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">+{(campaignsByDay[day] || []).length - 3} more</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!hasCampaignsThisMonth && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No campaigns scheduled for {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Use the arrows to browse other months.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/campaigns/create?type=EMAIL&template=newsletter">
              <div className="cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:bg-muted hover:shadow-md hover:border-primary/30">
                <div className="rounded-full bg-blue-100 p-2.5 w-fit mb-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <p className="font-medium">Newsletter</p>
                <p className="text-xs text-muted-foreground mt-1">Regular updates to your audience</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=EMAIL&template=promotional">
              <div className="cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:bg-muted hover:shadow-md hover:border-primary/30">
                <div className="rounded-full bg-green-100 p-2.5 w-fit mb-3">
                  <Tag className="h-5 w-5 text-green-600" />
                </div>
                <p className="font-medium">Promotional</p>
                <p className="text-xs text-muted-foreground mt-1">Drive sales with special offers</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=SMS&template=open-house">
              <div className="cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:bg-muted hover:shadow-md hover:border-primary/30">
                <div className="rounded-full bg-purple-100 p-2.5 w-fit mb-3">
                  <CalendarIcon className="h-5 w-5 text-purple-600" />
                </div>
                <p className="font-medium">Open House Invite</p>
                <p className="text-xs text-muted-foreground mt-1">Invite leads to open houses via SMS</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=EMAIL&template=survey">
              <div className="cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:bg-muted hover:shadow-md hover:border-primary/30">
                <div className="rounded-full bg-orange-100 p-2.5 w-fit mb-3">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
                <p className="font-medium">Survey</p>
                <p className="text-xs text-muted-foreground mt-1">Gather customer feedback</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      </>)}

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={(open) => { setShowStatusModal(open); if (!open) setNewStatus(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Campaign Status</DialogTitle>
            <DialogDescription>Change status for {selectedCampaigns.length} selected campaign(s)</DialogDescription>
          </DialogHeader>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-2">New Status</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={newStatus || ''}
                onChange={(e) => setNewStatus(e.target.value as Campaign['status'])}
              >
                <option value="">Select status...</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
          <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false)
                  setNewStatus(undefined)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusChange}
                disabled={!newStatus}
              >
                Update Status
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => { setShowDeleteModal(open); if (!open) setCampaignToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span className="text-red-600">Delete Campaign</span></DialogTitle>
            <DialogDescription>
              {campaignToDelete
                ? `Are you sure you want to delete "${campaigns.find(c => c.id === campaignToDelete)?.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedCampaigns.length} selected campaign(s)? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setCampaignToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (campaignToDelete) {
                    handleDeleteSingle(campaignToDelete)
                  } else {
                    handleBulkDelete()
                  }
                }}
              >
                Delete
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Modal */}
      <Dialog open={showDuplicateModal && !!campaignToDuplicate} onOpenChange={(open) => { setShowDuplicateModal(open); if (!open) setCampaignToDuplicate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Campaign</DialogTitle>
            <DialogDescription>
              Create a copy of &ldquo;{campaigns.find(c => c.id === campaignToDuplicate)?.name}&rdquo;? The duplicate will be created as a draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDuplicateModal(false)
                  setCampaignToDuplicate(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleDuplicateCampaign}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}

export default CampaignsList
