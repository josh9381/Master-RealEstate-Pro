import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Edit, Pause, Play, Trash2, Copy, ShieldCheck, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, analyticsApi, deliverabilityApi, CreateCampaignData } from '@/lib/api'
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav'
import { CampaignExecutionStatus } from '@/components/campaigns/CampaignExecutionStatus'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import type { Campaign, TimelineDataPoint, HourlyEngagementEntry, DeviceBreakdownEntry, GeoBreakdownEntry } from '@/types'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)

  // Fetch campaign from API
  const { data: campaignResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await campaignsApi.getCampaign(id!)
      return response.data?.campaign || response.data || response
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Get campaign data with fallback to default structure
  const campaignData = useMemo(() => {
    if (!campaignResponse) {
      return {
        id,
        name: 'Loading...',
        type: 'EMAIL' as string,
        status: 'DRAFT' as string,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        subject: '',
        content: '',
        fullContent: '',
        budget: 0,
        spent: 0,
      }
    }

    return {
      ...campaignResponse,
      opened: campaignResponse.opened ?? campaignResponse.opens ?? 0,
      clicked: campaignResponse.clicked ?? campaignResponse.clicks ?? 0,
      converted: campaignResponse.converted ?? campaignResponse.conversions ?? 0,
      fullContent: campaignResponse.body || campaignResponse.content || campaignResponse.fullContent || '',
    }
  }, [campaignResponse, id])

  // Fetch real campaign analytics from backend
  const { data: analyticsData } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: async () => {
      const response = await campaignsApi.getCampaignAnalytics(id!)
      return response.data || response
    },
    enabled: !!id && !!campaignResponse,
    retry: false,
  })

  // Fetch per-campaign deliverability stats
  const { data: deliverabilityData } = useQuery({
    queryKey: ['campaign-deliverability', id],
    queryFn: async () => {
      const response = await deliverabilityApi.getCampaignStats(id!)
      return response.data || response
    },
    enabled: !!id && !!campaignResponse,
    retry: false,
  })

  // Fetch campaign timeline data
  const { data: timelineData } = useQuery({
    queryKey: ['campaign-timeline', id],
    queryFn: async () => {
      const response = await campaignsApi.getCampaignTimeline(id!, { days: 30 })
      return response.data || response
    },
    enabled: !!id && !!campaignResponse,
    retry: false,
  })

  // Derive chart data from campaign metrics + real analytics
  const hasSentData = (campaignData.sent ?? 0) > 0 || (analyticsData?.sent ?? 0) > 0

  const performanceData = useMemo(() => {
    // Use real timeline data from the campaign analytics API
    if (timelineData && Array.isArray(timelineData) && timelineData.length > 0) {
      return timelineData.map((d: TimelineDataPoint) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: d.sent ?? 0,
        opened: d.opened ?? 0,
        clicked: d.clicked ?? 0,
      }))
    }
    return []
  }, [timelineData])

  const funnelData = useMemo(() => {
    // Prefer analytics data over campaign field data
    const sent = analyticsData?.sent ?? campaignData.sent ?? 0
    if (sent === 0) return []
    const delivered = analyticsData?.delivered ?? campaignData.delivered ?? 0
    const opened = analyticsData?.opened ?? campaignData.opened ?? 0
    const clicked = analyticsData?.clicked ?? campaignData.clicked ?? 0
    const converted = analyticsData?.converted ?? campaignData.converted ?? 0
    return [
      { stage: 'Sent', count: sent, percentage: 100 },
      { stage: 'Delivered', count: delivered, percentage: sent > 0 ? Math.round((delivered / sent) * 100) : 0 },
      { stage: 'Opened', count: opened, percentage: sent > 0 ? Math.round((opened / sent) * 100) : 0 },
      { stage: 'Clicked', count: clicked, percentage: sent > 0 ? Math.round((clicked / sent) * 100) : 0 },
      { stage: 'Converted', count: converted, percentage: sent > 0 ? Math.round((converted / sent) * 100) : 0 },
    ]
  }, [analyticsData, campaignData.sent, campaignData.delivered, campaignData.opened, campaignData.clicked, campaignData.converted])

  // Fetch hourly engagement data scoped to this campaign
  const { data: hourlyResponse } = useQuery({
    queryKey: ['hourly-engagement', id],
    queryFn: async () => {
      const response = await analyticsApi.getHourlyEngagement({ days: 90, campaignId: id })
      return response.data || response
    },
    enabled: !!id && hasSentData,
    retry: false,
  })

  const hourlyEngagementData = useMemo((): { hour: string; opens: number; clicks: number }[] => {
    if (hourlyResponse?.hourly && Array.isArray(hourlyResponse.hourly)) {
      return hourlyResponse.hourly.map((h: HourlyEngagementEntry) => ({
        hour: h.label,
        opens: h.opens ?? 0,
        clicks: h.clicks ?? 0,
      }))
    }
    return []
  }, [hourlyResponse])

  // Phase 8.9: Fetch real device/geo breakdown
  const { data: deviceBreakdownData } = useQuery({
    queryKey: ['campaign-device-breakdown', id],
    queryFn: async () => {
      const response = await analyticsApi.getDeviceBreakdown({ campaignId: id! })
      return response.data || null
    },
    enabled: !!id && hasSentData,
    retry: false,
  })

  const { data: geoBreakdownData } = useQuery({
    queryKey: ['campaign-geo-breakdown', id],
    queryFn: async () => {
      const response = await analyticsApi.getGeographicBreakdown({ campaignId: id! })
      return response.data || null
    },
    enabled: !!id && hasSentData,
    retry: false,
  })

  const realDeviceData = useMemo(() => {
    if (!deviceBreakdownData?.devices || deviceBreakdownData.devices.length === 0) return []
    const colorMap: Record<string, string> = { Desktop: '#3b82f6', Mobile: '#10b981', Tablet: '#f59e0b', Unknown: '#94a3b8' }
    return deviceBreakdownData.devices.map((d: DeviceBreakdownEntry) => ({
      name: d.name,
      value: d.count,
      color: colorMap[d.name] || '#8b5cf6',
    }))
  }, [deviceBreakdownData])

  const realGeoData = useMemo(() => {
    if (!geoBreakdownData?.countries || geoBreakdownData.countries.length === 0) return []
    return geoBreakdownData.countries.map((c: GeoBreakdownEntry) => ({
      location: c.name,
      opens: c.count,
      clicks: 0,
      conversions: 0,
    }))
  }, [geoBreakdownData])

  const [editForm, setEditForm] = useState<typeof campaignData | null>(null)

  // Keep editForm in sync when campaign data loads
  useEffect(() => {
    if (campaignResponse) {
      setEditForm(campaignData)
    }
  }, [campaignResponse, campaignData])

  // Resolve the form data (never use placeholder values)
  const resolvedEditForm = editForm ?? campaignData

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (data: Partial<CreateCampaignData>) => {
      if (!id) throw new Error('Campaign ID is required')
      return campaignsApi.updateCampaign(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign updated successfully')
    },
    onError: () => {
      toast.error('Failed to update campaign')
    },
  })

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Campaign ID is required')
      return campaignsApi.deleteCampaign(id)
    },
    onSuccess: () => {
      toast.success('Campaign deleted successfully')
      navigate('/campaigns')
    },
    onError: () => {
      toast.error('Failed to delete campaign')
    },
  })

  // Duplicate campaign mutation
  const duplicateCampaignMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Campaign ID is required')
      return campaignsApi.duplicateCampaign(id, `${campaignData.name} (Copy)`)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign duplicated successfully')
      // Navigate to the new campaign
      if (response.data?.campaign?.id) {
        navigate(`/campaigns/${response.data.campaign.id}`)
      }
    },
    onError: () => {
      toast.error('Failed to duplicate campaign')
    },
  })

  const handleStatusToggle = () => {
    const currentStatus = (campaignData.status || '').toUpperCase()
    let newStatus: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
    if (currentStatus === 'ACTIVE') {
      newStatus = 'PAUSED'
    } else if (currentStatus === 'PAUSED') {
      newStatus = 'ACTIVE'
    } else if (currentStatus === 'DRAFT') {
      newStatus = 'SCHEDULED'
    } else if (currentStatus === 'SCHEDULED') {
      newStatus = 'ACTIVE'
    } else {
      newStatus = 'ACTIVE'
    }
    updateCampaignMutation.mutate({ status: newStatus })
  }

  const handleSaveEdit = () => {
    if (!resolvedEditForm.name?.trim()) {
      toast.error('Campaign name is required')
      return
    }
    if (resolvedEditForm.type === 'email' || resolvedEditForm.type === 'EMAIL') {
      if (!resolvedEditForm.subject?.trim()) {
        toast.error('Email subject is required')
        return
      }
      if (!(resolvedEditForm.fullContent?.trim() || resolvedEditForm.content?.trim())) {
        toast.error('Email body content is required')
        return
      }
    }
    if (resolvedEditForm.startDate && new Date(resolvedEditForm.startDate) < new Date() && !['ACTIVE', 'COMPLETED', 'SENDING'].includes((resolvedEditForm.status || '').toUpperCase())) {
      toast.error('Start date must be in the future')
      return
    }
    updateCampaignMutation.mutate({
      name: resolvedEditForm.name,
      type: (resolvedEditForm.type || '').toUpperCase() as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL',
      status: (resolvedEditForm.status || '').toUpperCase() as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED',
      subject: resolvedEditForm.subject || undefined,
      body: resolvedEditForm.fullContent || resolvedEditForm.content || undefined,
      startDate: resolvedEditForm.startDate || undefined,
      endDate: resolvedEditForm.endDate || undefined,
      budget: resolvedEditForm.budget != null ? resolvedEditForm.budget : undefined,
    })
    setShowEditModal(false)
  }

  const handleDelete = () => {
    deleteCampaignMutation.mutate()
    setShowDeleteModal(false)
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

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <CampaignsSubNav />
        <ErrorBanner 
          message={`Failed to load campaign: ${error instanceof Error ? error.message : 'Unknown error'}`}
          retry={refetch}
        />
      </div>
    )
  }

  // Show 404 if campaign not found
  if (!campaignResponse) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Campaign Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The campaign you're looking for doesn't exist.
          </p>
          <Button className="mt-4" onClick={() => navigate('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const campaign = campaignData

  const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : '0.0'
  const clickRate = campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : '0.0'
  const conversionRate = campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <CampaignsSubNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant={
              (campaign.status || '').toUpperCase() === 'ACTIVE' ? 'success'
              : (campaign.status || '').toUpperCase() === 'PAUSED' ? 'secondary'
              : (campaign.status || '').toUpperCase() === 'SCHEDULED' ? 'warning'
              : (campaign.status || '').toUpperCase() === 'COMPLETED' ? 'outline'
              : 'secondary'
            }>{(campaign.status || '').charAt(0).toUpperCase() + (campaign.status || '').slice(1).toLowerCase()}</Badge>
            <span className="text-sm text-muted-foreground">
              {campaign.startDate || campaign.endDate
                ? `${campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'} - ${campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A'}`
                : 'No dates set'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => duplicateCampaignMutation.mutate()}
            disabled={duplicateCampaignMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            {duplicateCampaignMutation.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
          <Button
            variant="outline"
            onClick={handleStatusToggle}
            disabled={updateCampaignMutation.isPending}
          >
            {campaign.status?.toUpperCase() === 'ACTIVE'
              ? <><Pause className="mr-2 h-4 w-4" />Pause</>
              : campaign.status?.toUpperCase() === 'DRAFT'
              ? <><Play className="mr-2 h-4 w-4" />Schedule</>
              : <><Play className="mr-2 h-4 w-4" />Resume</>}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteCampaignMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.sent ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.opened ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{openRate}% open rate</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clicked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.clicked ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{clickRate}% click rate</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.converted ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unsubscribed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.unsubscribed ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.sent ? ((campaign.unsubscribed ?? 0) / campaign.sent * 100).toFixed(1) : '0.0'}% unsub rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deliverability Stats */}
      {deliverabilityData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Delivery Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{deliverabilityData.deliveryRate ?? 0}%</div>
              <p className="text-xs text-muted-foreground">{(deliverabilityData.delivered ?? 0).toLocaleString()} of {(deliverabilityData.sent ?? 0).toLocaleString()} delivered</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Bounce Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(deliverabilityData.bounceRate ?? 0) > 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {deliverabilityData.bounceRate ?? 0}%
                {(deliverabilityData.bounceRate ?? 0) > 5 && <span className="text-sm ml-1">(High)</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {(deliverabilityData.hardBounces ?? 0)} hard / {(deliverabilityData.softBounces ?? 0)} soft
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Spam Complaints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(deliverabilityData.complaintRate ?? 0) > 0.1 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {deliverabilityData.complaintRate ?? 0}%
              </div>
              <p className="text-xs text-muted-foreground">{(deliverabilityData.spamComplaints ?? 0).toLocaleString()} complaints</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Execution Status */}
      {(['SENDING', 'ACTIVE', 'SCHEDULED'].includes((campaign.status || '').toUpperCase())) && (
        <CampaignExecutionStatus
          campaignId={campaign.id}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['campaign', id] })}
        />
      )}

      {/* Performance Chart */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {hasSentData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
                <Line type="monotone" dataKey="opened" stroke="#10b981" name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#f59e0b" name="Clicked" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Analytics available when campaign tracking is configured.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Performance Dashboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Funnel */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
            <div className="space-y-3">
              {funnelData.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="text-muted-foreground">
                      {stage.count.toLocaleString()} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${stage.percentage}%`,
                        background: `linear-gradient(to right, ${COLORS[index]}, ${COLORS[index]}dd)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {realDeviceData.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={realDeviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {realDeviceData.map((entry: { name: string; value: number; color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {realDeviceData.map((device: { name: string; value: number; color: string }) => (
                <div key={device.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: device.color }}
                    />
                    <span>{device.name}</span>
                  </div>
                  <span className="font-medium">{device.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement by Time of Day */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Engagement by Time of Day</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyEngagementData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyEngagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="opens" fill="#10b981" name="Opens" />
                <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {realGeoData.length > 0 ? (
            <div className="space-y-4">
              {realGeoData.map((location: { location: string; opens: number; clicks: number; conversions: number }, index: number) => (
                <div key={location.location} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{location.location}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">
                        {location.opens} opens
                      </span>
                      <span className="text-blue-600">
                        {location.clicks} clicks
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(location.opens / Math.max(...realGeoData.map((g: { opens: number }) => g.opens), 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(location.clicks / Math.max(...realGeoData.map((g: { clicks: number }) => g.clicks), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {location.conversions} conversions
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* A/B Test Results */}
      {campaignData?.isABTest && <ABTestResultsSection campaignId={id!} />}

      {/* Revenue & Budget */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Revenue & Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Revenue Generated
              </div>
              <div className="text-2xl font-bold">${campaign.revenue?.toLocaleString() || '0'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Budget
              </div>
              <div className="text-2xl font-bold">
                {campaign.budget && campaign.budget > 0 ? `$${campaign.budget.toLocaleString()}` : 'No budget set'}
              </div>
              {campaign.spent != null && campaign.spent > 0 && (
                <div className="text-xs text-muted-foreground">Spent: ${campaign.spent.toLocaleString()}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Content Preview */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Campaign Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 bg-muted/30">
            <h3 className="text-lg font-semibold mb-2">{campaign.subject}</h3>
            <p className="text-muted-foreground">
              {campaign.content || campaign.previewText || campaign.body || 'No content preview available'}
            </p>
            <Button className="mt-4" onClick={() => setShowContentModal(true)}>View Full Content</Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Recipient Activity Log */}
      <RecipientActivitySection campaignId={id || ''} />

      {/* Full Content Modal */}
      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Full Campaign Content</DialogTitle>
          </DialogHeader>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border">
              {(campaign.type || '').toUpperCase() === 'EMAIL' ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.fullContent || campaign.body || '<p>No content available</p>') }} />
              ) : (
                <div className="whitespace-pre-wrap">{campaign.fullContent || campaign.body || 'No content available'}</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContentModal(false)}
            >
              Close
            </Button>
            <Button onClick={() => {
              setShowContentModal(false)
              setShowEditModal(true)
            }}>
              Edit Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Basic Information</h4>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <Input
                    value={resolvedEditForm.name}
                    onChange={(e) => setEditForm({ ...resolvedEditForm, name: e.target.value })}
                    placeholder="Enter campaign name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={resolvedEditForm.type}
                      onChange={(e) => setEditForm({ ...resolvedEditForm, type: e.target.value as 'EMAIL' | 'SMS' | 'PHONE' })}
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="PHONE">Phone</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    {(() => {
                      const validTransitions: Record<string, string[]> = {
                        DRAFT: ['SCHEDULED', 'ACTIVE'],
                        SCHEDULED: ['DRAFT', 'ACTIVE', 'CANCELLED'],
                        ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
                        PAUSED: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'DRAFT'],
                        SENDING: ['ACTIVE', 'PAUSED', 'CANCELLED', 'DRAFT'],
                        COMPLETED: ['DRAFT'],
                        CANCELLED: ['DRAFT'],
                      };
                      const currentStatus = (campaignData.status || 'DRAFT').toUpperCase();
                      const options = [currentStatus, ...(validTransitions[currentStatus] || [])];
                      return (
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={resolvedEditForm.status}
                          onChange={(e) => setEditForm({ ...resolvedEditForm, status: e.target.value as Campaign['status'] })}
                        >
                          {options.map(s => (
                            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={resolvedEditForm.startDate}
                      onChange={(e) => setEditForm({ ...resolvedEditForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      value={resolvedEditForm.endDate}
                      onChange={(e) => setEditForm({ ...resolvedEditForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Budget</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Total Budget</label>
                  <Input
                    type="number"
                    value={resolvedEditForm.budget}
                    onChange={(e) => setEditForm({ ...resolvedEditForm, budget: Number(e.target.value) })}
                    placeholder="Enter budget"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Amount Spent</label>
                  <Input
                    type="number"
                    value={resolvedEditForm.spent}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    title="Spent amount is tracked automatically"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Campaign Content</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject/Title</label>
                  <Input
                    value={resolvedEditForm.subject}
                    onChange={(e) => setEditForm({ ...resolvedEditForm, subject: e.target.value })}
                    placeholder="Enter subject or title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preview Content</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                    value={resolvedEditForm.content}
                    onChange={(e) => setEditForm({ ...resolvedEditForm, content: e.target.value })}
                    placeholder="Enter preview content"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Full Content (HTML)</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[200px] font-mono text-sm"
                    value={resolvedEditForm.fullContent}
                    onChange={(e) => setEditForm({ ...resolvedEditForm, fullContent: e.target.value })}
                    placeholder="Enter full HTML content"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCampaignMutation.isPending}>
              {updateCampaignMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle><span className="text-red-600">Delete Campaign</span></DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone and all campaign data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCampaignMutation.isPending}
            >
              {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CampaignDetail

// ─── Per-Recipient Activity Section ─────────────────────────────

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  OPENED: { label: 'Opened', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  CLICKED: { label: 'Clicked', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  BOUNCED: { label: 'Bounced', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  UNSUBSCRIBED: { label: 'Unsubscribed', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  CONVERTED: { label: 'Converted', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
}

/**
 * ABTestResultsSection — Shows per-variant stats, winner badge, and confidence
 */
function ABTestResultsSection({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-abtest-results', campaignId],
    queryFn: async () => {
      const res = await campaignsApi.getABTestResults(campaignId)
      return res?.data || null
    },
    refetchInterval: 30000, // Refresh every 30s while viewing
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>A/B Test Results</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.evaluation) {
    return (
      <Card>
        <CardHeader><CardTitle>A/B Test Results</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">
            A/B test results will appear here once the campaign sends.
          </div>
        </CardContent>
      </Card>
    )
  }

  const { test, evaluation, evalHours, winnerMetric } = data
  const { variantA, variantB, winner, confidence, marginPercent } = evaluation
  const isCompleted = test?.status === 'COMPLETED'

  const renderVariantCard = (variant: 'A' | 'B', stats: typeof variantA, subjectLabel: string) => {
    const isWinner = winner === variant
    return (
      <div className={`p-4 border rounded-lg relative ${isWinner && isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={isWinner && isCompleted ? 'default' : 'secondary'}>
            Variant {variant}
          </Badge>
          {isWinner && isCompleted && (
            <Badge className="bg-green-600 text-white">Winner</Badge>
          )}
        </div>
        <h4 className="font-medium mb-3">{subjectLabel}</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Sent</div>
            <div className="font-semibold text-lg">{stats.total}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Opened</div>
            <div className="font-semibold text-lg">{stats.opened}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Open Rate</div>
            <div className={`font-semibold text-lg ${isWinner && winnerMetric === 'open_rate' ? 'text-green-600' : ''}`}>
              {stats.openRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Click Rate</div>
            <div className={`font-semibold text-lg ${isWinner && winnerMetric === 'click_rate' ? 'text-green-600' : ''}`}>
              {stats.clickRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>A/B Test Results</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? 'default' : 'secondary'}>
              {isCompleted ? 'Completed' : 'Running'}
            </Badge>
            {!isCompleted && (
              <span className="text-xs text-muted-foreground">
                Auto-evaluates after {evalHours}h
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderVariantCard('A', variantA, (test?.variantA as Record<string, unknown>)?.subject as string || 'Original')}
          {renderVariantCard('B', variantB, (test?.variantB as Record<string, unknown>)?.subject as string || 'Variant')}
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
          <div>
            <span className="font-medium">Metric:</span>{' '}
            {winnerMetric === 'open_rate' ? 'Open Rate' : 'Click Rate'}
          </div>
          <div>
            <span className="font-medium">Margin:</span> {marginPercent}%
          </div>
          <div>
            <span className="font-medium">Confidence:</span>{' '}
            <span className={confidence >= 0.95 ? 'text-green-600 font-semibold' : confidence >= 0.8 ? 'text-yellow-600' : 'text-muted-foreground'}>
              {(confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="font-medium">Winner:</span>{' '}
            {winner === 'TIE' ? 'No clear winner' : `Variant ${winner}`}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecipientActivitySection({ campaignId }: { campaignId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-recipients', campaignId, page, statusFilter],
    queryFn: () => campaignsApi.getCampaignRecipients(campaignId, {
      page,
      limit: 25,
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    enabled: expanded && !!campaignId,
  })

  const recipients = data?.data?.recipients || []
  const total = data?.data?.total ?? 0
  const totalPages = data?.data?.totalPages || 1
  const statusSummary = data?.data?.statusSummary || {}

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—'

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Per-Recipient Activity</CardTitle>
            {total > 0 && <Badge variant="secondary">{total} recipients</Badge>}
          </div>
          {expanded ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <ChevronDown className="h-5 w-5" aria-hidden="true" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => { setStatusFilter(''); setPage(1) }}
            >
              All
            </button>
            {Object.entries(STATUS_BADGES).map(([key, { label }]) => {
              const count = statusSummary[key] ?? 0
              if (count === 0 && !statusFilter) return null
              return (
                <button
                  key={key}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1) }}
                >
                  {label} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading recipients...</div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recipient activity data yet. Data will appear after the campaign is sent.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Recipient</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Sent</th>
                      <th className="pb-2 font-medium">Delivered</th>
                      <th className="pb-2 font-medium">Opened</th>
                      <th className="pb-2 font-medium">Clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r: { id: string; status: string; lead?: { firstName?: string; lastName?: string; email?: string; phone?: string }; sentAt?: string; deliveredAt?: string; openedAt?: string; clickedAt?: string }) => {
                      const badge = STATUS_BADGES[r.status] || STATUS_BADGES.PENDING
                      return (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2">
                            <div className="font-medium">{r.lead?.firstName} {r.lead?.lastName}</div>
                            <div className="text-xs text-muted-foreground">{r.lead?.email || r.lead?.phone || '—'}</div>
                          </td>
                          <td className="py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">{formatDate(r.sentAt)}</td>
                          <td className="py-2 text-xs text-muted-foreground">{formatDate(r.deliveredAt)}</td>
                          <td className="py-2 text-xs text-muted-foreground">{formatDate(r.openedAt)}</td>
                          <td className="py-2 text-xs text-muted-foreground">{formatDate(r.clickedAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
