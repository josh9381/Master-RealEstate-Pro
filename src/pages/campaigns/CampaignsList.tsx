import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Plus, Mail, MessageSquare, Phone, MoreHorizontal, Search,
  TrendingUp, DollarSign, Users, Target, Calendar as CalendarIcon,
  LayoutGrid, Download, Share2, BarChart3, LayoutList, X, Pause,
  PlayCircle, Copy, Trash2, Edit, Archive, ArchiveRestore
} from 'lucide-react'
import { mockCampaigns } from '@/data/mockData'
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav'
import { Campaign } from '@/types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/hooks/useToast'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { campaignsApi, CreateCampaignData } from '@/lib/api'
import { exportToCSV, campaignExportColumns } from '@/lib/exportService'
import { MOCK_DATA_CONFIG } from '@/config/mockData.config'
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate'
import { MockModeBanner } from '@/components/shared/MockModeBanner'

function CampaignsList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'ACTIVE' | 'SCHEDULED' | 'PAUSED' | 'COMPLETED'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRowMenu, setShowRowMenu] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<Campaign['status'] | undefined>(undefined)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<{ name: string; type: 'EMAIL' | 'SMS' | 'PHONE' }>({ name: '', type: 'EMAIL' })

  // Fetch campaigns from API
  const { data: campaignsResponse, isLoading } = useQuery({
    queryKey: ['campaigns', searchQuery],
    queryFn: async () => {
      try {
        const params: { 
          search?: string; 
          status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
          type?: 'EMAIL' | 'SMS' | 'PHONE';
        } = {}
        if (searchQuery) params.search = searchQuery
        // Don't send status filter to API - we'll filter client-side for better UX
        // if (activeTab !== 'all') {
        //   params.status = activeTab.toUpperCase() as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
        // }
        
        const response = await campaignsApi.getCampaigns(params)
        return response.data
      } catch (error) {
        return null
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Smart data source - use API data or fallback to mock (if enabled)
  const campaigns = useMemo(() => {
    if (campaignsResponse?.campaigns && campaignsResponse.campaigns.length > 0) {
      return campaignsResponse.campaigns as Campaign[]
    }
    if (MOCK_DATA_CONFIG.USE_MOCK_DATA) {
      return mockCampaigns as Campaign[]
    }
    return []
  }, [campaignsResponse])

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignData) => campaignsApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign created successfully')
      setShowCreateModal(false)
      setCreateForm({ name: '', type: 'EMAIL' })
    },
    onError: () => {
      toast.error('Failed to create campaign')
    },
  })

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCampaignData> }) =>
      campaignsApi.updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign updated successfully')
    },
    onError: () => {
      toast.error('Failed to update campaign')
    },
  })

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

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.sendCampaign(id),
    onSuccess: () => {
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

  // Handle quick create campaign
  const handleQuickCreate = () => {
    if (!createForm.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    createCampaignMutation.mutate({
      name: createForm.name.trim(),
      type: createForm.type,
      status: 'DRAFT',
    })
  }

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTab = activeTab === 'all' || campaign.status.toUpperCase() === activeTab.toUpperCase()
      return matchesSearch && matchesTab
    })
    return filtered
  }, [campaigns, searchQuery, activeTab])

  // Calculate statistics
  const stats = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE')
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0)
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0)
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0)
    const avgROI = totalSpent > 0 ? ((totalRevenue / totalSpent) * 100).toFixed(0) : '0'

    return {
      active: activeCampaigns.length,
      totalSent,
      totalRevenue,
      avgROI,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalSpent
    }
  }, [campaigns])

  // Performance by type
  const performanceByType = useMemo(() => {
    const types = ['EMAIL', 'SMS', 'PHONE', 'SOCIAL']
    return types.map(type => {
      const typeCampaigns = campaigns.filter(c => (c.type || '').toUpperCase() === type)
      const revenue = typeCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0)
      const spent = typeCampaigns.reduce((sum, c) => sum + (c.spent || 0), 0)
      return {
        type: type.charAt(0) + type.slice(1).toLowerCase(),
        campaigns: typeCampaigns.length,
        revenue,
        spent,
        roi: spent > 0 ? ((revenue / spent) * 100).toFixed(0) : '0'
      }
    })
  }, [campaigns])

  // Calendar data
  const calendarData = useMemo(() => {
    const grouped: Record<string, Campaign[]> = {}
    filteredCampaigns.forEach(campaign => {
      const date = campaign.startDate ? campaign.startDate.split('T')[0] : 'No Date'
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(campaign)
    })
    return grouped
  }, [filteredCampaigns])

  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'success'
      case 'SCHEDULED': return 'warning'
      case 'PAUSED': return 'secondary'
      case 'COMPLETED': return 'outline'
      case 'DRAFT': return 'secondary'
      default: return 'secondary'
    }
  }

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
  const handleStatusChange = () => {
    if (!newStatus) {
      toast.error('Please select a status')
      return
    }

    // Use API if we have real campaigns, otherwise update local state
    if (campaignsResponse?.campaigns) {
      selectedCampaigns.forEach(campaignId => {
        updateCampaignMutation.mutate({
          id: String(campaignId),
          data: { status: newStatus.toUpperCase() as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' }
        })
      })
    }

    setShowStatusModal(false)
    setNewStatus(undefined)
    setSelectedCampaigns([])
  }

  const handleBulkDelete = () => {
    // Use API if we have real campaigns
    if (campaignsResponse?.campaigns) {
      selectedCampaigns.forEach(campaignId => {
        deleteCampaignMutation.mutate(String(campaignId))
      })
    }

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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

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

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      {/* Mock Mode Warning */}
      <MockModeBanner />

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
            <Button onClick={() => setShowCreateModal(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Quick Create
            </Button>
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
        onChangeStatus={() => setShowStatusModal(true)}
        onExport={handleExportCSV}
        onDelete={() => setShowDeleteModal(true)}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average ROI</p>
                <p className="text-2xl font-bold">{stats.avgROI}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Spent Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">${(stats.totalBudget - stats.totalSpent).toLocaleString()}</p>
              </div>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${stats.totalBudget > 0 ? (stats.totalSpent / stats.totalBudget) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(1) : '0.0'}% of budget used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance by Type Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByType}>
                <CartesianGrid strokeDasharray="3 3" />
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

        <Card>
          <CardHeader>
            <CardTitle>ROI by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, roi }) => `${type}: ${roi}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {performanceByType.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b">
        {(['all', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'COMPLETED'] as const).map(tab => {
          const count = tab === 'all' 
            ? campaigns.length 
            : campaigns.filter(c => c.status.toUpperCase() === tab).length
          
          return (
            <button
              key={tab}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toLowerCase()}
              <span className="ml-2 text-sm text-muted-foreground">
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && !isLoading && (
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
                        <td className="py-2 text-right text-sm">{campaign.sent?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.opened?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.clicked?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.converted?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">${campaign.revenue?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm font-medium">{campaign.roi}</td>
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
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
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
                          Started {campaign.startDate}
                        </span>
                        {campaign.abTest && (
                          <Badge variant="outline" className="text-xs">
                            A/B Test - Winner: {campaign.abTest.winner}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowRowMenu(showRowMenu === campaign.id ? null : String(campaign.id))}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showRowMenu === campaign.id && (
                      <div className="absolute right-0 top-10 z-10 w-48 rounded-md border bg-background shadow-lg">
                        <Link to={`/campaigns/${campaign.id}`}>
                          <button className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted">
                            <Edit className="mr-2 h-4 w-4" />
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            setCampaignToDuplicate(String(campaign.id))
                            setShowDuplicateModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </button>
                        {campaign.status.toUpperCase() === 'ACTIVE' && (
                          <button
                            onClick={() => pauseCampaignMutation.mutate(String(campaign.id))}
                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </button>
                        )}
                        {campaign.status.toUpperCase() === 'PAUSED' && (
                          <button
                            onClick={() => resumeCampaignMutation.mutate(String(campaign.id))}
                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Resume
                          </button>
                        )}
                        {(campaign.status.toUpperCase() === 'DRAFT' || campaign.status.toUpperCase() === 'SCHEDULED') && (
                          <button
                            onClick={() => sendCampaignMutation.mutate(String(campaign.id))}
                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Now
                          </button>
                        )}
                        {campaign.isArchived ? (
                          <button
                            onClick={() => {
                              unarchiveCampaignMutation.mutate(String(campaign.id))
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              archiveCampaignMutation.mutate(String(campaign.id))
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCampaigns([String(campaign.id)])
                            setShowStatusModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Change Status
                        </button>
                        <button
                          onClick={() => {
                            setCampaignToDelete(String(campaign.id))
                            setShowDeleteModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold">{campaign.sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-2xl font-bold">{(campaign.opened || 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.opened && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.opened / campaign.sent) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clicked</p>
                    <p className="text-2xl font-bold">{(campaign.clicked || 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.clicked && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold">{campaign.roi}</p>
                    <p className="text-xs text-muted-foreground">
                      ${(campaign.revenue || 0).toLocaleString()} revenue
                    </p>
                  </div>
                </div>
                {campaign.budget && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Budget: ${campaign.budget.toLocaleString()}</span>
                      <span>Spent: ${(campaign.spent || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${((campaign.spent || 0) / campaign.budget) * 100}%` }}
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
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(String(campaign.id))}
                    onChange={() => toggleCampaignSelection(String(campaign.id))}
                    className="rounded"
                  />
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowRowMenu(showRowMenu === campaign.id ? null : String(campaign.id))}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showRowMenu === campaign.id && (
                      <div className="absolute right-0 top-10 z-10 w-48 rounded-md border bg-background shadow-lg">
                        <Link to={`/campaigns/${campaign.id}`}>
                          <button className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted">
                            <Edit className="mr-2 h-4 w-4" />
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            setCampaignToDuplicate(String(campaign.id))
                            setShowDuplicateModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCampaigns([String(campaign.id)])
                            setShowStatusModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Change Status
                        </button>
                        <button
                          onClick={() => {
                            setCampaignToDelete(String(campaign.id))
                            setShowDeleteModal(true)
                            setShowRowMenu(null)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </div>
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
                    <span className="font-bold">{campaign.sent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Opens</span>
                    <div className="text-right">
                      <span className="font-bold">{(campaign.opened || 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.opened && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.opened / campaign.sent) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <div className="text-right">
                      <span className="font-bold">{(campaign.clicked || 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.clicked && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">ROI</span>
                      <span className="text-lg font-bold text-green-600">{campaign.roi}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      ${(campaign.revenue || 0).toLocaleString()} revenue
                    </p>
                  </div>
                  {campaign.budget && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Budget</span>
                        <span>${(campaign.spent || 0).toLocaleString()} / ${campaign.budget.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${((campaign.spent || 0) / campaign.budget) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Started {campaign.startDate}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && filteredCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(calendarData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, campaigns]) => (
                  <div key={date} className="border-l-4 border-primary pl-4">
                    <p className="mb-2 font-medium text-sm text-muted-foreground">{date}</p>
                    <div className="space-y-2">
                      {campaigns.map(campaign => (
                        <div key={campaign.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                              {getTypeIcon(campaign.type)}
                            </div>
                            <div>
                              <Link to={`/campaigns/${campaign.id}`} className="font-medium hover:text-primary">
                                {campaign.name}
                              </Link>
                              <p className="text-xs text-muted-foreground capitalize">{campaign.type} • {campaign.status}</p>
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(campaign.status)}>{campaign.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link to="/campaigns/create?type=EMAIL">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                <p className="font-medium">Newsletter</p>
                <p className="text-xs text-muted-foreground">Regular updates to your audience</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=EMAIL">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <Target className="h-8 w-8 text-green-600 mb-2" />
                <p className="font-medium">Promotional</p>
                <p className="text-xs text-muted-foreground">Drive sales with special offers</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=SMS">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <CalendarIcon className="h-8 w-8 text-purple-600 mb-2" />
                <p className="font-medium">Event Invite</p>
                <p className="text-xs text-muted-foreground">Invite to webinars & events</p>
              </div>
            </Link>
            <Link to="/campaigns/create?type=EMAIL">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <MessageSquare className="h-8 w-8 text-orange-600 mb-2" />
                <p className="font-medium">Survey</p>
                <p className="text-xs text-muted-foreground">Gather customer feedback</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Change Campaign Status</h3>
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setNewStatus(undefined)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Change status for {selectedCampaigns.length} selected campaign(s)
            </p>
            <div className="mb-6">
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
            <div className="flex gap-3 justify-end">
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
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Delete Campaign</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setCampaignToDelete(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {campaignToDelete
                ? `Are you sure you want to delete "${campaigns.find(c => c.id === campaignToDelete)?.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedCampaigns.length} selected campaign(s)? This action cannot be undone.`
              }
            </p>
            <div className="flex gap-3 justify-end">
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
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && campaignToDuplicate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Duplicate Campaign</h3>
              <button
                onClick={() => {
                  setShowDuplicateModal(false)
                  setCampaignToDuplicate(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Create a copy of "{campaigns.find(c => c.id === campaignToDuplicate)?.name}"? The duplicate will be created as a draft.
            </p>
            <div className="flex gap-3 justify-end">
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
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Quick Create Campaign</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ name: '', type: 'EMAIL' })
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Enter campaign name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as 'EMAIL' | 'SMS' | 'PHONE' })}
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ name: '', type: 'EMAIL' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickCreate}
                disabled={createCampaignMutation.isPending || !createForm.name.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createCampaignMutation.isPending ? 'Creating...' : 'Create Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignsList
