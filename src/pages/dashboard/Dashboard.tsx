import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  Users,
  
  Target,
  Megaphone,
  Plus,
  Calendar,
  Download,
  RefreshCw,
  Bell,
  Mail,
  
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Filter,
  AlertCircle
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { analyticsApi, campaignsApi, tasksApi } from '@/lib/api'
import { GettingStarted } from '@/components/onboarding/GettingStarted'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import type { Campaign, ConversionStage, RevenueMonth, ActivityRecord, DashboardActivity, DashboardTask, DashboardCampaign, DashboardAlert } from '@/types'

// Types
interface StatCard {
  name: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  target: string
  progress: number
  helpText?: string
}

function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSource, setFilterSource] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  // Convert dateRange string to startDate/endDate params
  const dateParams = useMemo(() => {
    const now = new Date()
    const end = now.toISOString().split('T')[0]
    let start: Date
    switch (dateRange) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case '30d':
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }
    return { startDate: start.toISOString().split('T')[0], endDate: end }
  }, [dateRange])

  // Fetch dashboard statistics from API
  const { data: dashboardData, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', dateRange, filterSource, filterStatus, filterPriority],
    queryFn: async () => {
      const params: Record<string, string> = { ...dateParams }
      if (filterSource !== 'all') params.source = filterSource
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterPriority !== 'all') params.priority = filterPriority
      const response = await analyticsApi.getDashboardStats(params)
      return response.data
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // Fetch lead analytics for charts
  const { data: leadAnalyticsData, isLoading: leadsLoading, isError: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ['lead-analytics', dateRange, filterSource, filterStatus, filterPriority],
    queryFn: async () => {
      const params: Record<string, string> = { ...dateParams }
      if (filterSource !== 'all') params.source = filterSource
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterPriority !== 'all') params.priority = filterPriority
      const response = await analyticsApi.getLeadAnalytics(params)
      return response.data
    },
  })

  // Fetch campaign analytics for charts
  const { data: campaignAnalyticsData, isLoading: campaignAnalyticsLoading, isError: campaignAnalyticsError, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaign-analytics', dateRange],
    queryFn: async () => {
      const response = await analyticsApi.getCampaignAnalytics(dateParams)
      return response.data
    },
  })

  // Fetch conversion funnel for charts
  const { data: conversionFunnelData, isLoading: funnelLoading, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ['conversion-funnel', dateRange],
    queryFn: async () => {
      const response = await analyticsApi.getConversionFunnel(dateParams)
      return response.data
    },
  })

  // Fetch activity feed for recent activities
  const { data: activityFeedData, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useQuery({
    queryKey: ['activity-feed', dateRange],
    queryFn: async () => {
      const response = await analyticsApi.getActivityFeed({ limit: 6 })
      return response.data
    },
  })

  // Fetch recent tasks
  const { data: tasksData, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useQuery({
    queryKey: ['recent-tasks', dateRange],
    queryFn: async () => {
      const response = await tasksApi.getTasks({ page: 1, limit: 5 })
      return response.data
    },
  })

  // Fetch top campaigns
  const { data: topCampaignsData, isLoading: topCampaignsLoading, isError: topCampaignsError, refetch: refetchTopCampaigns } = useQuery({
    queryKey: ['top-campaigns'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ page: 1, limit: 3, sortBy: 'converted', sortOrder: 'desc' })
      return response.data
    },
  })

  // Fetch revenue timeline data (Phase 5)
  const { data: revenueTimelineData, isLoading: revenueLoading, isError: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ['revenue-timeline'],
    queryFn: async () => {
      const response = await analyticsApi.getRevenueTimeline({ months: 12 })
      return response.data
    },
    retry: false,
  })

  // Fetch dashboard alerts (Phase 5)
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const response = await analyticsApi.getDashboardAlerts()
      return response.data
    },
    retry: false,
  })

  const isLoading = statsLoading

  // Transform API data for charts
  // Lead source data for pie chart
  const leadSourceData = leadAnalyticsData?.bySource 
    ? Object.entries(leadAnalyticsData.bySource).map(([name, value], index) => ({
        name,
        value: typeof value === 'number' ? value : 0,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'][index] || '#6b7280'
      }))
    : []

  // Conversion funnel data
  const conversionData = conversionFunnelData?.stages 
    ? conversionFunnelData.stages.map((stage: ConversionStage) => ({
        stage: stage.name,
        count: stage.count || 0,
        rate: stage.percentage || 0
      }))
    : []

  // Campaign performance by type
  const campaignPerformance = campaignAnalyticsData?.byType
    ? Object.entries(campaignAnalyticsData.byType).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
        opens: 0, // Not available in current API
        clicks: 0,
        conversions: typeof count === 'number' ? count : 0
      }))
    : []

  // Recent activities from API
  const recentActivities: DashboardActivity[] = activityFeedData?.activities?.slice(0, 6).map((activity: ActivityRecord) => ({
    id: activity.id,
    type: (activity.type || 'note').toLowerCase(),
    action: activity.title || '',
    lead: activity.lead?.name || activity.description || '',
    time: new Date(activity.createdAt).toLocaleString(),
    icon: Users // Default icon
  })) || []

  // Upcoming tasks from API
  const upcomingTasks: DashboardTask[] = tasksData?.tasks?.slice(0, 5).map((task: { id: string; title: string; dueDate?: string; priority?: string; status?: string }) => ({
    id: task.id,
    title: task.title,
    due: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
    priority: (task.priority || 'medium').toLowerCase(),
    status: (task.status || 'pending').toLowerCase()
  })) || []

  // Top campaigns from API
  const topCampaigns: DashboardCampaign[] = topCampaignsData?.campaigns?.slice(0, 3).map((campaign: Campaign) => ({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    opens: campaign.opened || 0,
    clicks: campaign.clicked || 0,
    conversions: campaign.converted || 0,
    roi: campaign.roi ? (String(campaign.roi).endsWith('%') ? String(campaign.roi) : `${campaign.roi}%`) : '0%'
  })) || []

  // Revenue data from API
  const revenueData = revenueTimelineData?.monthly
    ? revenueTimelineData.monthly.map((m: RevenueMonth) => ({
        month: m.month,
        revenue: m.totalRevenue || 0,
        leads: m.deals || 0,
      }))
    : []

  // Quick stats from API
  const quickStats = [
    { label: 'Total Activities', value: dashboardData?.activities?.total?.toString() || '0', change: '+0%' },
    { label: 'Tasks Due Today', value: dashboardData?.tasks?.dueToday?.toString() || '0', change: '+0' },
    { label: 'Active Campaigns', value: dashboardData?.campaigns?.active?.toString() || '0', change: '+0' },
    { label: 'Tasks Completed', value: `${dashboardData?.tasks?.completed || 0}/${dashboardData?.tasks?.total || 0}`, change: `${dashboardData?.tasks?.completionRate || 0}%` },
  ]

  // Dashboard performance targets (can be customized per organization)
  const DEFAULT_LEADS_TARGET = 3000
  const DEFAULT_CAMPAIGNS_TARGET = 15
  const DEFAULT_CONVERSION_RATE_TARGET = 20
  const DEFAULT_TASK_COMPLETION_TARGET = 100

  // Transform API data into UI format
  const stats = dashboardData ? [
    {
      name: 'Total Leads',
      value: dashboardData.overview?.totalLeads?.toString() || '0',
      change: dashboardData.leads?.new ? `+${dashboardData.leads.new}` : '+0',
      trend: 'up' as const,
      icon: Users,
      target: DEFAULT_LEADS_TARGET.toLocaleString(),
      progress: Math.min(Math.round((dashboardData.overview?.totalLeads / DEFAULT_LEADS_TARGET) * 100), 100) || 0,
      helpText: 'Total number of leads in your CRM. Includes all statuses (new, contacted, qualified, won, lost).',
    },
    {
      name: 'Active Campaigns',
      value: dashboardData.overview?.activeCampaigns?.toString() || '0',
      change: `+${dashboardData.campaigns?.active || 0}`,
      trend: 'up' as const,
      icon: Megaphone,
      target: DEFAULT_CAMPAIGNS_TARGET.toString(),
      progress: Math.min(Math.round((dashboardData.overview?.activeCampaigns / DEFAULT_CAMPAIGNS_TARGET) * 100), 100) || 0,
      helpText: 'Campaigns currently running or scheduled to send. Completed and draft campaigns are not counted.',
    },
    {
      name: 'Conversion Rate',
      value: `${dashboardData.leads?.conversionRate?.toFixed(1) ?? '0.0'}%`,
      change: dashboardData.leads?.previousConversionRate != null
        ? `${((dashboardData.leads?.conversionRate ?? 0) - dashboardData.leads.previousConversionRate).toFixed(1)}%`
        : '—',
      trend: dashboardData.leads?.previousConversionRate != null
        ? ((dashboardData.leads?.conversionRate ?? 0) >= dashboardData.leads.previousConversionRate ? 'up' as const : 'down' as const)
        : 'up' as const,
      icon: Target,
      target: `${DEFAULT_CONVERSION_RATE_TARGET}%`,
      progress: Math.min(Math.round((dashboardData.leads?.conversionRate / DEFAULT_CONVERSION_RATE_TARGET) * 100), 100) || 0,
      helpText: 'Percentage of total leads that reached "Won" status. Calculated as (Won leads ÷ Total leads) × 100. Higher is better — aim for 15-25% in real estate.',
    },
    {
      name: 'Tasks Completed',
      value: `${dashboardData.tasks?.completed || 0}/${dashboardData.tasks?.total || 0}`,
      change: `${dashboardData.tasks?.completionRate || 0}%`,
      trend: 'up' as const,
      icon: CheckCircle2,
      target: `${DEFAULT_TASK_COMPLETION_TARGET}%`,
      progress: dashboardData.tasks?.completionRate ?? 0,
      helpText: 'Tasks marked as completed out of all assigned tasks. The percentage shows your completion rate for the selected time period.',
    },
  ] as StatCard[] : [
    {
      name: 'Total Leads',
      value: '0',
      change: '+0',
      trend: 'up' as const,
      icon: Users,
      target: DEFAULT_LEADS_TARGET.toLocaleString(),
      progress: 0
    },
    {
      name: 'Active Campaigns',
      value: '0',
      change: '+0',
      trend: 'up' as const,
      icon: Megaphone,
      target: DEFAULT_CAMPAIGNS_TARGET.toString(),
      progress: 0
    },
    {
      name: 'Conversion Rate',
      value: '0.0%',
      change: '—',
      trend: 'up' as const,
      icon: Target,
      target: `${DEFAULT_CONVERSION_RATE_TARGET}%`,
      progress: 0
    },
    {
      name: 'Tasks Completed',
      value: '0/0',
      change: '0%',
      trend: 'up' as const,
      icon: CheckCircle2,
      target: `${DEFAULT_TASK_COMPLETION_TARGET}%`,
      progress: 0
    },
  ] as StatCard[]

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchStats(),
        refetchLeads(),
        refetchCampaigns(),
        refetchFunnel(),
        refetchActivity(),
        refetchTasks(),
        refetchTopCampaigns(),
        refetchRevenue(),
        refetchAlerts(),
      ])
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refetchStats, refetchLeads, refetchCampaigns, refetchFunnel, refetchActivity, refetchTasks, refetchTopCampaigns, refetchRevenue, refetchAlerts])

  // Handle task completion toggle
  const handleTaskComplete = useCallback(async (taskId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'completed') {
        // Mark as incomplete by updating status back to pending
        await tasksApi.updateTask(taskId, { status: 'pending' })
      } else {
        // Mark as complete
        await tasksApi.completeTask(taskId)
      }
      // Refetch tasks and stats to reflect the change
      refetchTasks()
      refetchStats()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task. Please try again.')
    }
  }, [refetchTasks, refetchStats, toast])

  const handleExport = () => {
    // Mock export functionality
    const data = JSON.stringify({ stats, revenueData, conversionData }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard-data.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <select
            className="px-3 py-2 text-sm border rounded-md"
            value={dateRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}
            aria-label="Select date range for dashboard data"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block" htmlFor="filter-source">Lead Source</label>
                <select
                  id="filter-source"
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  aria-label="Filter by lead source"
                >
                  <option value="all">All Sources</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" htmlFor="filter-status">Status</label>
                <select
                  id="filter-status"
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" htmlFor="filter-priority">Priority</label>
                <select
                  id="filter-priority"
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  aria-label="Filter by priority"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => { refetchStats(); refetchLeads(); refetchCampaigns(); }}>
                Apply Filters
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setFilterSource('all'); setFilterStatus('all'); setFilterPriority('all'); }}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Wizard — shows when user has no data */}
      <GettingStarted
        totalLeads={dashboardData?.overview?.totalLeads || 0}
        totalCampaigns={dashboardData?.overview?.totalCampaigns || dashboardData?.campaigns?.total || 0}
        hasCampaignResults={!!(dashboardData?.campaigns?.totalSent > 0)}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button onClick={() => navigate('/leads/create')} className="h-auto py-4 flex-col gap-2">
          <Plus className="h-5 w-5" />
          <span>New Lead</span>
        </Button>
        <Button onClick={() => navigate('/campaigns/create')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Megaphone className="h-5 w-5" />
          <span>New Campaign</span>
        </Button>
        <Button onClick={() => navigate('/communication')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Mail className="h-5 w-5" />
          <span>Send Email</span>
        </Button>
        <Button onClick={() => navigate('/calendar')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Calendar className="h-5 w-5" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Main Stats Cards with Progress */}
      {statsError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-500 mb-2">Failed to load dashboard stats</p>
            <Button variant="outline" size="sm" onClick={() => refetchStats()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                {stat.name}
                {stat.helpText && <HelpTooltip text={stat.helpText} />}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="flex items-center text-xs text-muted-foreground">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {stat.change}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">Goal: {stat.target}</span>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Secondary Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {quickStats.map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Badge variant="secondary" className="text-xs">{item.change}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue & Performance Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue & Leads Trend</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">6-month overview</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} aria-label="View full analytics">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            ) : revenueError ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Failed to load chart data. <Button variant="link" size="sm" onClick={() => refetchRevenue()}>Retry</Button></p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="leads" stroke="#10b981" fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                Conversion Funnel
                <HelpTooltip text="Shows how leads progress through your sales stages: New → Contacted → Qualified → Proposal → Won. Each bar represents the number of leads at that stage. The overall rate shows what percentage of all leads eventually convert to 'Won'." />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Lead progression</p>
            </div>
            <Badge>{conversionFunnelData?.overallConversionRate ? `${conversionFunnelData.overallConversionRate}%` : '—'} Overall</Badge>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            ) : funnelError ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Failed to load funnel data. <Button variant="link" size="sm" onClick={() => refetchFunnel()}>Retry</Button></p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="stage" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Distribution by channel</p>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-4">
                <div className="h-[250px] bg-muted animate-pulse rounded" />
              </div>
            ) : leadsError ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Failed to load lead sources</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchLeads()}>Retry</Button>
              </div>
            ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {leadSourceData.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                      <span className="text-sm">{source.name}</span>
                    </div>
                    <span className="text-sm font-medium">{source.value}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">By channel</p>
          </CardHeader>
          <CardContent>
            {campaignAnalyticsLoading ? (
              <div className="h-[250px] bg-muted animate-pulse rounded" />
            ) : campaignAnalyticsError ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Failed to load campaign data</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchCampaigns()}>Retry</Button>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="opens" fill="#3b82f6" />
                <Bar dataKey="clicks" fill="#10b981" />
                <Bar dataKey="conversions" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity & Tasks Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityError ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <p>Failed to load activities. <Button variant="link" size="sm" onClick={() => refetchActivity()}>Retry</Button></p>
              </div>
            ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="mt-1 p-2 rounded-full bg-primary/10">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.lead}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                    <div className="h-4 w-4 bg-muted rounded mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tasksError ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <p>Failed to load tasks. <Button variant="link" size="sm" onClick={() => refetchTasks()}>Retry</Button></p>
              </div>
            ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 cursor-pointer"
                    checked={task.status === 'completed'}
                    onChange={() => handleTaskComplete(task.id, task.status)}
                    aria-label={`Mark task "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'warning' : 'secondary'
                      } className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{task.due}</span>
                      <Badge variant="outline" className="text-xs ml-2">{task.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Based on ROI and conversions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            View All Campaigns
          </Button>
        </CardHeader>
        <CardContent>
          {topCampaignsLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : topCampaignsError ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <p>Failed to load campaigns. <Button variant="link" size="sm" onClick={() => refetchTopCampaigns()}>Retry</Button></p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium">Campaign</th>
                  <th className="pb-3 text-left text-sm font-medium">Type</th>
                  <th className="pb-3 text-right text-sm font-medium">Opens</th>
                  <th className="pb-3 text-right text-sm font-medium">Clicks</th>
                  <th className="pb-3 text-right text-sm font-medium">Conversions</th>
                  <th className="pb-3 text-right text-sm font-medium">ROI</th>
                  <th className="pb-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-4 text-sm font-medium">{campaign.name}</td>
                    <td className="py-4">
                      <Badge variant="secondary">{campaign.type}</Badge>
                    </td>
                    <td className="py-4 text-sm text-right">{campaign.opens.toLocaleString()}</td>
                    <td className="py-4 text-sm text-right">{campaign.clicks.toLocaleString()}</td>
                    <td className="py-4 text-sm text-right font-medium">{campaign.conversions}</td>
                    <td className="py-4 text-sm text-right">
                      <Badge variant="success">{campaign.roi}</Badge>
                    </td>
                    <td className="py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts & Notifications */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            <CardTitle>Alerts & Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {alertsData?.alerts && alertsData.alerts.length > 0 ? (
            <div className="space-y-3">
              {alertsData.alerts.map((alert: DashboardAlert, index: number) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    alert.type === 'urgent'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                      : alert.type === 'warning'
                      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                      : alert.type === 'success'
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  </div>
                  {alert.category === 'leads' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {alert.category === 'tasks' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {alert.category === 'campaigns' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {alert.category === 'messages' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/communication')}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <p className="text-sm">No alerts yet. Alerts will appear here as your data grows.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
