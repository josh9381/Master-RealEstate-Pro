import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Save } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, CreateCampaignData } from '@/lib/api'
import { mockCampaigns } from '@/data/mockData'
import { MOCK_DATA_CONFIG } from '@/config/mockData.config'

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
  })

  // Fetch campaign from API
  const { data: campaignResponse, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      try {
        const response = await campaignsApi.getCampaign(id!)
        return response.data?.campaign || response.data || null
      } catch {
        if (MOCK_DATA_CONFIG.USE_MOCK_DATA) {
          const mockCampaign = mockCampaigns.find(c => String(c.id) === id)
          return mockCampaign || null
        }
        return null
      }
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
    updateCampaignMutation.mutate({
      name: editForm.name,
      type: editForm.type as 'EMAIL' | 'SMS' | 'PHONE',
      status: editForm.status as 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED',
      subject: editForm.subject || undefined,
      body: editForm.body || undefined,
      previewText: editForm.previewText || undefined,
      startDate: editForm.startDate || undefined,
      endDate: editForm.endDate || undefined,
      budget: editForm.budget || undefined,
    })
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/campaigns/${id}`)}>
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
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
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
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[250px] font-mono text-sm"
              value={editForm.body}
              onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
              placeholder="Enter campaign body content"
            />
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
