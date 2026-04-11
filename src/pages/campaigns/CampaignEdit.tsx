import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Save } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, CreateCampaignData } from '@/lib/api'
import { EmailBlockEditor } from '@/components/email/EmailBlockEditor'

function CampaignEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [editForm, setEditForm] = useState({
    name: '',
    type: 'EMAIL' as string,
    status: 'DRAFT' as string,
    subject: '',
    body: '',
    previewText: '',
    startDate: '',
    endDate: '',
    budget: 0,
    spent: 0,
    isABTest: false,
    abTestData: null as Record<string, unknown> | null,
    abTestWinnerMetric: 'openRate' as string,
    abTestEvalHours: 24,
    isRecurring: false,
    frequency: '' as string,
    recurringPattern: '' as string,
    maxOccurrences: 0,
    sendTimeOptimization: 'none' as 'none' | 'timezone' | 'engagement' | 'both',
  })

  // Fetch campaign from API
  const { data: campaignResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await campaignsApi.getCampaign(id!)
      return response.data?.campaign || response.data || null
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Populate form when data loads
  useEffect(() => {
    if (campaignResponse) {
      setEditForm({
        name: campaignResponse.name || '',
        type: (campaignResponse.type || 'EMAIL').toUpperCase(),
        status: (campaignResponse.status || 'DRAFT').toUpperCase(),
        subject: campaignResponse.subject || '',
        body: campaignResponse.body || campaignResponse.fullContent || '',
        previewText: campaignResponse.previewText || '',
        startDate: campaignResponse.startDate ? new Date(campaignResponse.startDate).toISOString().split('T')[0] : '',
        endDate: campaignResponse.endDate ? new Date(campaignResponse.endDate).toISOString().split('T')[0] : '',
        budget: campaignResponse.budget || 0,
        spent: campaignResponse.spent || 0,
        isABTest: campaignResponse.isABTest || false,
        abTestData: campaignResponse.abTestData || null,
        abTestWinnerMetric: campaignResponse.abTestWinnerMetric || 'openRate',
        abTestEvalHours: campaignResponse.abTestEvalHours || 24,
        isRecurring: campaignResponse.isRecurring || false,
        frequency: campaignResponse.frequency || '',
        recurringPattern: typeof campaignResponse.recurringPattern === 'string' ? campaignResponse.recurringPattern : '',
        maxOccurrences: campaignResponse.maxOccurrences || 0,
        sendTimeOptimization: campaignResponse.sendTimeOptimization || 'none',
      })
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
      navigate(`/campaigns/${id}`)
    },
    onError: () => {
      toast.error('Failed to update campaign')
    },
  })

  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('Campaign name is required')
      return
    }
    if (editForm.startDate && editForm.endDate && editForm.endDate < editForm.startDate) {
      toast.error('End date must be on or after start date')
      return
    }
    updateCampaignMutation.mutate({
      name: editForm.name,
      type: editForm.type as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL',
      status: editForm.status as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED',
      subject: editForm.subject || undefined,
      body: editForm.body || undefined,
      previewText: editForm.previewText || undefined,
      startDate: editForm.startDate || undefined,
      endDate: editForm.endDate || undefined,
      budget: editForm.budget != null ? editForm.budget : undefined,
      isABTest: editForm.isABTest,
      abTestData: editForm.abTestData || undefined,
      abTestWinnerMetric: editForm.isABTest ? editForm.abTestWinnerMetric : undefined,
      abTestEvalHours: editForm.isABTest ? editForm.abTestEvalHours : undefined,
      isRecurring: editForm.isRecurring,
      frequency: editForm.frequency ? editForm.frequency as 'daily' | 'weekly' | 'monthly' : undefined,
      recurringPattern: editForm.recurringPattern || undefined,
      maxOccurrences: editForm.maxOccurrences || undefined,
      sendTimeOptimization: editForm.sendTimeOptimization !== 'none' ? editForm.sendTimeOptimization : undefined,
    } as Partial<CreateCampaignData>)
  }

  if (isError) {
    return (
      <div className="space-y-6 p-4">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load campaign'} retry={refetch} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-1/3 mb-2" />
          <div className="h-6 bg-muted rounded w-1/4" />
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/campaigns/${id}`)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Campaign</h1>
            <p className="mt-1 text-muted-foreground">
              Modify your campaign settings and content
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/campaigns/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateCampaignMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateCampaignMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
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
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {(() => {
                  const validTransitions: Record<string, string[]> = {
                    DRAFT: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'CANCELLED'],
                    SCHEDULED: ['SCHEDULED', 'ACTIVE', 'CANCELLED', 'DRAFT'],
                    ACTIVE: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
                    SENDING: ['SENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DRAFT'],
                    PAUSED: ['PAUSED', 'ACTIVE', 'CANCELLED'],
                    COMPLETED: ['COMPLETED'],
                    CANCELLED: ['CANCELLED', 'DRAFT'],
                  };
                  const allowed = validTransitions[editForm.status] || [editForm.status];
                  const labels: Record<string, string> = {
                    DRAFT: 'Draft', SCHEDULED: 'Scheduled', ACTIVE: 'Active',
                    SENDING: 'Sending', PAUSED: 'Paused', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
                  };
                  return allowed.map(s => (
                    <option key={s} value={s}>{labels[s] || s}</option>
                  ));
                })()}
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
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Total Budget ($)</label>
              <Input
                type="number"
                value={editForm.budget}
                onChange={(e) => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                placeholder="Enter budget"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount Spent ($)</label>
              <Input
                type="number"
                value={editForm.spent}
                onChange={(e) => setEditForm({ ...editForm, spent: Number(e.target.value) })}
                placeholder="Enter amount spent"
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A/B Testing */}
      <Card>
        <CardHeader>
          <CardTitle>A/B Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isABTest"
              checked={editForm.isABTest}
              onChange={(e) => setEditForm({ ...editForm, isABTest: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isABTest" className="text-sm font-medium">Enable A/B Testing</label>
          </div>
          {editForm.isABTest && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Winner Metric</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={editForm.abTestWinnerMetric}
                  onChange={(e) => setEditForm({ ...editForm, abTestWinnerMetric: e.target.value })}
                >
                  <option value="openRate">Open Rate</option>
                  <option value="clickRate">Click Rate</option>
                  <option value="conversionRate">Conversion Rate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Evaluation Period (hours)</label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={editForm.abTestEvalHours}
                  onChange={(e) => setEditForm({ ...editForm, abTestEvalHours: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={editForm.isRecurring}
              onChange={(e) => setEditForm({ ...editForm, isRecurring: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">Enable Recurring Schedule</label>
          </div>
          {editForm.isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Frequency</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={editForm.frequency}
                  onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Occurrences (0 = unlimited)</label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.maxOccurrences}
                  onChange={(e) => setEditForm({ ...editForm, maxOccurrences: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendTimeOptimization"
              checked={editForm.sendTimeOptimization !== 'none'}
              onChange={(e) => setEditForm({ ...editForm, sendTimeOptimization: e.target.checked ? 'engagement' : 'none' })}
              className="rounded"
            />
            <label htmlFor="sendTimeOptimization" className="text-sm font-medium">Send Time Optimization</label>
          </div>
          {editForm.sendTimeOptimization !== 'none' && (
            <div>
              <label className="block text-sm font-medium mb-2">Optimization Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={editForm.sendTimeOptimization}
                onChange={(e) => setEditForm({ ...editForm, sendTimeOptimization: e.target.value as 'timezone' | 'engagement' | 'both' })}
              >
                <option value="timezone">Timezone-based</option>
                <option value="engagement">Engagement-based</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Content */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject / Title</label>
            <Input
              value={editForm.subject}
              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              placeholder="Enter subject or title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Preview Text</label>
            <Input
              value={editForm.previewText}
              onChange={(e) => setEditForm({ ...editForm, previewText: e.target.value })}
              placeholder="Enter preview text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Content / Body</label>
            {editForm.type === 'EMAIL' ? (
              <EmailBlockEditor
                value={editForm.body}
                onChange={(value) => setEditForm({ ...editForm, body: value })}
                minHeight="300px"
                showTemplates={false}
              />
            ) : (
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[250px] font-mono text-sm"
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                placeholder="Enter campaign body content"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Bar */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate(`/campaigns/${id}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateCampaignMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateCampaignMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

export default CampaignEdit
