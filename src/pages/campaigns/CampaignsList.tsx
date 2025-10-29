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
  LayoutGrid, Download, Share2, BarChart3, LayoutList, X, 
  PlayCircle, Copy, Trash2, Edit
} from 'lucide-react'
import { mockCampaigns } from '@/data/mockData'
import { Campaign } from '@/types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useToast } from '@/hooks/useToast'
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar'
import { campaignsApi, CreateCampaignData } from '@/lib/api'

function CampaignsList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'scheduled' | 'paused' | 'completed'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([])
  const [showComparison, setShowComparison] = useState(false)
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showRowMenu, setShowRowMenu] = useState<number | null>(null)
  const [newStatus, setNewStatus] = useState<Campaign['status'] | undefined>(undefined)
  const [campaignToDelete, setCampaignToDelete] = useState<number | null>(null)
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<number | null>(null)

  // Fetch campaigns from API
  const { data: campaignsResponse, isLoading } = useQuery({
    queryKey: ['campaigns', searchQuery, activeTab],
    queryFn: async () => {
      try {
        const params: { 
          search?: string; 
          status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
          type?: 'email' | 'sms' | 'phone';
        } = {}
        if (searchQuery) params.search = searchQuery
        if (activeTab !== 'all') {
          params.status = activeTab as 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
        }
        
        const response = await campaignsApi.getCampaigns(params)
        return response.data
      } catch (error) {
        console.log('API fetch failed, using mock data')
        return null
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Smart data source - use API data or fallback to mock
  const campaigns = useMemo(() => {
    if (campaignsResponse?.campaigns && campaignsResponse.campaigns.length > 0) {
      return campaignsResponse.campaigns as Campaign[]
    }
    return mockCampaigns as Campaign[]
  }, [campaignsResponse])

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignData) => campaignsApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign created successfully')
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

  // Pause campaign mutation (available for status actions)
  const _pauseCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.pauseCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign paused')
    },
    onError: () => {
      toast.error('Failed to pause campaign')
    },
  })

  // Send campaign mutation (available for campaign launch)
  const _sendCampaignMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.sendCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign sent successfully')
    },
    onError: () => {
      toast.error('Failed to send campaign')
    },
  })

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTab = activeTab === 'all' || campaign.status === activeTab
      return matchesSearch && matchesTab
    })
    return filtered
  }, [campaigns, searchQuery, activeTab])

  // Calculate statistics
  const stats = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active')
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
    const types = ['email', 'sms', 'phone', 'social']
    return types.map(type => {
      const typeCampaigns = campaigns.filter(c => c.type === type)
      const revenue = typeCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0)
      const spent = typeCampaigns.reduce((sum, c) => sum + (c.spent || 0), 0)
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
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
      const date = campaign.startDate
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(campaign)
    })
    return grouped
  }, [filteredCampaigns])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'scheduled': return 'warning'
      case 'paused': return 'secondary'
      case 'completed': return 'outline'
      case 'draft': return 'secondary'
      default: return 'secondary'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />
      case 'sms': return <MessageSquare className="h-5 w-5" />
      case 'phone': return <Phone className="h-5 w-5" />
      case 'social': return <Share2 className="h-5 w-5" />
      default: return null
    }
  }

  const toggleCampaignSelection = (id: number) => {
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
          data: { status: newStatus }
        })
      })
    }

    toast.success(`Status updated for ${selectedCampaigns.length} campaign(s)`)
    setShowStatusModal(false)
    setNewStatus('active')
    setSelectedCampaigns([])
  }

  const handleBulkDelete = () => {
    // Use API if we have real campaigns
    if (campaignsResponse?.campaigns) {
      selectedCampaigns.forEach(campaignId => {
        deleteCampaignMutation.mutate(String(campaignId))
      })
    }

    toast.success(`Deleted ${selectedCampaigns.length} campaign(s)`)
    setShowDeleteModal(false)
    setSelectedCampaigns([])
  }

  const handleDeleteSingle = (id: number) => {
    // Use API if we have real campaigns
    if (campaignsResponse?.campaigns) {
      deleteCampaignMutation.mutate(String(id))
    }

    setCampaignToDelete(null)
    setShowRowMenu(null)
  }

  const handleDuplicateCampaign = () => {
    if (!campaignToDuplicate) return

    const originalCampaign = campaigns.find(c => c.id === campaignToDuplicate)
    if (!originalCampaign) return

    // Use API if we have real campaigns
    if (campaignsResponse?.campaigns) {
      createCampaignMutation.mutate({
        name: `${originalCampaign.name} (Copy)`,
        type: originalCampaign.type as 'email' | 'sms' | 'phone',
        status: 'draft',
        subject: originalCampaign.subject || undefined,
      })
    }

    toast.success('Campaign duplicated successfully')
    setShowDuplicateModal(false)
    setCampaignToDuplicate(null)
    setShowRowMenu(null)
  }

  const handleExportCSV = () => {
    const selectedCampaignsData = selectedCampaigns.length > 0
      ? campaigns.filter(c => selectedCampaigns.includes(c.id as number))
      : campaigns

    const headers = ['Name', 'Type', 'Status', 'Sent', 'Opens', 'Clicks', 'Conversions', 'Revenue', 'ROI', 'Budget', 'Spent']
    const rows = selectedCampaignsData.map(campaign => [
      `"${campaign.name}"`,
      campaign.type,
      campaign.status,
      campaign.sent.toString(),
      (campaign.opens || 0).toString(),
      (campaign.clicks || 0).toString(),
      (campaign.conversions || 0).toString(),
      (campaign.revenue || 0).toString(),
      campaign.roi || '0%',
      (campaign.budget || 0).toString(),
      (campaign.spent || 0).toString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-2 text-muted-foreground">
            Create and manage your marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link to="/campaigns/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
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
                style={{ width: `${(stats.totalSpent / stats.totalBudget) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {((stats.totalSpent / stats.totalBudget) * 100).toFixed(1)}% of budget used
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
        {(['all', 'active', 'scheduled', 'paused', 'completed'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            <span className="ml-2 text-sm text-muted-foreground">
              ({tab === 'all' ? mockCampaigns.length : mockCampaigns.filter(c => c.status === tab).length})
            </span>
          </button>
        ))}
      </div>

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
                    const campaign = mockCampaigns.find(c => c.id === id)
                    if (!campaign) return null
                    return (
                      <tr key={id} className="border-b">
                        <td className="py-2 text-sm">{campaign.name}</td>
                        <td className="py-2 text-right text-sm capitalize">{campaign.type}</td>
                        <td className="py-2 text-right text-sm">{campaign.sent?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.opens?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.clicks?.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm">{campaign.conversions?.toLocaleString()}</td>
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
      {viewMode === 'list' && (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(campaign.id as number)}
                      onChange={() => toggleCampaignSelection(campaign.id as number)}
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
                      onClick={() => setShowRowMenu(showRowMenu === campaign.id ? null : campaign.id as number)}
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
                            setCampaignToDuplicate(campaign.id as number)
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
                            setSelectedCampaigns([campaign.id as number])
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
                            setCampaignToDelete(campaign.id as number)
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
                    <p className="text-2xl font-bold">{(campaign.opens || 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.opens && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.opens / campaign.sent) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clicked</p>
                    <p className="text-2xl font-bold">{(campaign.clicks || 0).toLocaleString()}</p>
                    {campaign.sent > 0 && campaign.clicks && (
                      <p className="text-xs text-muted-foreground">
                        {((campaign.clicks / campaign.sent) * 100).toFixed(1)}%
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
      {viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id as number)}
                    onChange={() => toggleCampaignSelection(campaign.id as number)}
                    className="rounded"
                  />
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowRowMenu(showRowMenu === campaign.id ? null : campaign.id as number)}
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
                            setCampaignToDuplicate(campaign.id as number)
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
                            setSelectedCampaigns([campaign.id as number])
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
                            setCampaignToDelete(campaign.id as number)
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
                      <span className="font-bold">{(campaign.opens || 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.opens && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.opens / campaign.sent) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <div className="text-right">
                      <span className="font-bold">{(campaign.clicks || 0).toLocaleString()}</span>
                      {campaign.sent > 0 && campaign.clicks && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.clicks / campaign.sent) * 100).toFixed(1)}%
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
      {viewMode === 'calendar' && (
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
            <Link to="/campaigns/create?template=newsletter">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                <p className="font-medium">Newsletter</p>
                <p className="text-xs text-muted-foreground">Regular updates to your audience</p>
              </div>
            </Link>
            <Link to="/campaigns/create?template=promo">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <Target className="h-8 w-8 text-green-600 mb-2" />
                <p className="font-medium">Promotional</p>
                <p className="text-xs text-muted-foreground">Drive sales with special offers</p>
              </div>
            </Link>
            <Link to="/campaigns/create?template=event">
              <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted">
                <CalendarIcon className="h-8 w-8 text-purple-600 mb-2" />
                <p className="font-medium">Event Invite</p>
                <p className="text-xs text-muted-foreground">Invite to webinars & events</p>
              </div>
            </Link>
            <Link to="/campaigns/create?template=survey">
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
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
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
    </div>
  )
}

export default CampaignsList
