import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Edit, Pause, Trash2, X, Copy } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, analyticsApi, CreateCampaignData } from '@/lib/api'
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav'
import { CampaignExecutionStatus } from '@/components/campaigns/CampaignExecutionStatus'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import type { TimelineDataPoint, HourlyEngagementEntry, DeviceBreakdownEntry, GeoBreakdownEntry, ABTestResultEntry } from '@/types'
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
        type: 'email' as 'email' | 'sms' | 'phone' | 'social',
        status: 'draft' as 'active' | 'paused' | 'completed' | 'draft' | 'scheduled',
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
      opened: campaignResponse.opened || campaignResponse.opens || 0,
      clicked: campaignResponse.clicked || campaignResponse.clicks || 0,
      converted: campaignResponse.converted || campaignResponse.conversions || 0,
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
  const hasSentData = (campaignData.sent || 0) > 0 || (analyticsData?.sent || 0) > 0

  const performanceData = useMemo(() => {
    // Use real timeline data from the campaign analytics API
    if (timelineData && Array.isArray(timelineData) && timelineData.length > 0) {
      return timelineData.map((d: TimelineDataPoint) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: d.sent || 0,
        opened: d.opened || 0,
        clicked: d.clicked || 0,
      }))
    }
    return []
  }, [timelineData])

  const funnelData = useMemo(() => {
    // Prefer analytics data over campaign field data
    const sent = analyticsData?.sent || campaignData.sent || 0
    if (sent === 0) return []
    const delivered = analyticsData?.delivered || campaignData.delivered || 0
    const opened = analyticsData?.opened || campaignData.opened || 0
    const clicked = analyticsData?.clicked || campaignData.clicked || 0
    const converted = analyticsData?.converted || campaignData.converted || 0
    return [
      { stage: 'Sent', count: sent, percentage: 100 },
      { stage: 'Delivered', count: delivered, percentage: sent > 0 ? Math.round((delivered / sent) * 100) : 0 },
      { stage: 'Opened', count: opened, percentage: sent > 0 ? Math.round((opened / sent) * 100) : 0 },
      { stage: 'Clicked', count: clicked, percentage: sent > 0 ? Math.round((clicked / sent) * 100) : 0 },
      { stage: 'Converted', count: converted, percentage: sent > 0 ? Math.round((converted / sent) * 100) : 0 },
    ]
  }, [analyticsData, campaignData.sent, campaignData.delivered, campaignData.opened, campaignData.clicked, campaignData.converted])

  // Fetch hourly engagement data from Phase 5 backend
  const { data: hourlyResponse } = useQuery({
    queryKey: ['hourly-engagement'],
    queryFn: async () => {
      const response = await analyticsApi.getHourlyEngagement({ days: 90 })
      return response.data || response
    },
    enabled: !!id && hasSentData,
    retry: false,
  })

  const hourlyEngagementData = useMemo((): { hour: string; opens: number; clicks: number }[] => {
    if (hourlyResponse?.hourly && Array.isArray(hourlyResponse.hourly)) {
      return hourlyResponse.hourly.map((h: HourlyEngagementEntry) => ({
        hour: h.label,
        opens: h.opens || 0,
        clicks: h.clicks || 0,
      }))
    }
    return []
  }, [hourlyResponse])

  const deviceData = useMemo((): { name: string; value: number; color: string }[] => {
    // Phase 8.9: Fetch real device breakdown from analytics API
    return []
  }, [])

  const geoData = useMemo((): { location: string; opens: number; clicks: number; conversions: number }[] => {
    // Phase 8.9: Fetch real geographic data from analytics API
    return []
  }, [])

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
    if (!deviceBreakdownData?.devices || deviceBreakdownData.devices.length === 0) return deviceData
    const colorMap: Record<string, string> = { Desktop: '#3b82f6', Mobile: '#10b981', Tablet: '#f59e0b', Unknown: '#94a3b8' }
    return deviceBreakdownData.devices.map((d: DeviceBreakdownEntry) => ({
      name: d.name,
      value: d.count,
      color: colorMap[d.name] || '#8b5cf6',
    }))
  }, [deviceBreakdownData, deviceData])

  const realGeoData = useMemo(() => {
    if (!geoBreakdownData?.countries || geoBreakdownData.countries.length === 0) return geoData
    return geoBreakdownData.countries.map((c: GeoBreakdownEntry) => ({
      location: c.name,
      opens: c.count,
      clicks: 0,
      conversions: 0,
    }))
  }, [geoBreakdownData, geoData])

  // Fetch A/B test results for this campaign
  const { data: abTestResults } = useQuery({
    queryKey: ['campaign-abtest', id],
    queryFn: async () => {
      if (!campaignData?.isABTest) return null
      const abRes = await campaignsApi.getCampaignAnalytics(id!)
      if (abRes?.data?.abTests) {
        return Array.isArray(abRes.data.abTests) ? abRes.data.abTests : null
      }
      return null
    },
    enabled: !!id && !!campaignData?.isABTest,
    retry: false,
  })

  const [editForm, setEditForm] = useState(campaignData)

  // Keep editForm in sync when campaign data loads
  // (useState only captures initial value which is the loading placeholder)
  useEffect(() => {
    if (campaignResponse) {
      setEditForm(campaignData)
    }
  }, [campaignResponse])

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (data: Partial<CreateCampaignData>) =>
      campaignsApi.updateCampaign(id!, data),
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
    mutationFn: () => campaignsApi.deleteCampaign(id!),
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
    mutationFn: () => campaignsApi.duplicateCampaign(id!, `${campaignData.name} (Copy)`),
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
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    updateCampaignMutation.mutate({ status: newStatus })
  }

  const handleEditClick = () => {
    setEditForm({ ...campaignData })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editForm.name?.trim()) {
      toast.error('Campaign name is required')
      return
    }
    if (editForm.type === 'email' || editForm.type === 'EMAIL') {
      if (!editForm.subject?.trim()) {
        toast.error('Email subject is required')
        return
      }
    }
    if (editForm.startDate && new Date(editForm.startDate) < new Date()) {
      toast.error('Start date must be in the future')
      return
    }
    updateCampaignMutation.mutate({
      name: editForm.name,
      type: (editForm.type || '').toUpperCase() as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL',
      status: (editForm.status || '').toUpperCase() as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED',
      subject: editForm.subject || undefined,
      body: editForm.fullContent || editForm.content || undefined,
      startDate: editForm.startDate || undefined,
      endDate: editForm.endDate || undefined,
      budget: editForm.budget != null ? editForm.budget : undefined,
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
            }>{campaign.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'} - {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => duplicateCampaignMutation.mutate()}
            disabled={duplicateCampaignMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button variant="outline" onClick={handleStatusToggle}>
            <Pause className="mr-2 h-4 w-4" />
            {campaign.status?.toUpperCase() === 'ACTIVE' ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.sent || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.opened || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{openRate}% open rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clicked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.clicked || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{clickRate}% click rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.converted || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Execution Status */}
      {(['SENDING', 'ACTIVE', 'SCHEDULED'].includes((campaign.status || '').toUpperCase())) && (
        <CampaignExecutionStatus
          campaignId={campaign.id}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['campaign', id] })}
        />
      )}

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {hasSentData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
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
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Engagement by Time of Day</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Locations</CardTitle>
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
      {campaignData?.isABTest && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {abTestResults && abTestResults.length > 0 ? (
              <div className="space-y-4">
                {abTestResults.map((test: ABTestResultEntry) => (
                  <div key={test.id} className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <Badge variant="secondary" className="mb-2">Variant A</Badge>
                      <h4 className="font-medium">{test.variantA?.subject || 'Original'}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>Participants: {test._count?.results ? Math.ceil(test._count.results / 2) : 0}</div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <Badge variant="secondary" className="mb-2">Variant B</Badge>
                      <h4 className="font-medium">{test.variantB?.subject || 'Variant'}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>Participants: {test._count?.results ? Math.floor(test._count.results / 2) : 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                A/B test results will appear here once the campaign sends.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Open Rate
              </div>
              <div className="text-2xl font-bold">{openRate}%</div>
              <div className="text-xs text-muted-foreground">{campaign.opened?.toLocaleString() || 0} of {campaign.sent?.toLocaleString() || 0} opened</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Click-Through Rate
              </div>
              <div className="text-2xl font-bold">{clickRate}%</div>
              <div className="text-xs text-muted-foreground">{campaign.clicked?.toLocaleString() || 0} clicks</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Revenue Generated
              </div>
              <div className="text-2xl font-bold">${campaign.revenue?.toLocaleString() || '0'}</div>
              <div className="text-xs text-blue-600">
                {campaign.budget && campaign.budget > 0 ? `Budget: $${campaign.budget.toLocaleString()}` : 'No budget set'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Content</CardTitle>
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

      {/* Full Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Full Campaign Content</h3>
              <button
                onClick={() => setShowContentModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border">
                <div className="whitespace-pre-wrap">{campaign.fullContent || campaign.body || 'No content available'}</div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
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
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Edit Campaign</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Basic Information</h4>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Campaign Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL' })}
                      >
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="PHONE">Phone</option>
                        <option value="SOCIAL">Social Media</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT' | 'SCHEDULED' })}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SCHEDULED">Scheduled</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <Input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <Input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
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
                      value={editForm.budget}
                      onChange={(e) => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                      placeholder="Enter budget"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount Spent</label>
                    <Input
                      type="number"
                      value={editForm.spent}
                      onChange={(e) => setEditForm({ ...editForm, spent: Number(e.target.value) })}
                      placeholder="Enter amount spent"
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
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      placeholder="Enter subject or title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Preview Content</label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="Enter preview content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Content (HTML)</label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[200px] font-mono text-sm"
                      value={editForm.fullContent}
                      onChange={(e) => setEditForm({ ...editForm, fullContent: e.target.value })}
                      placeholder="Enter full HTML content"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
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
                onClick={() => setShowDeleteModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone and all campaign data will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete Campaign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignDetail
