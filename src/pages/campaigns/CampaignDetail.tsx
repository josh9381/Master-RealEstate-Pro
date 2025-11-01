import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Edit, Pause, Trash2, X } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, CreateCampaignData } from '@/lib/api'
import { mockCampaigns } from '@/data/mockData'
import { MOCK_DATA_CONFIG } from '@/config/mockData.config'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const performanceData = [
  { date: 'Jan 15', sent: 100, opened: 50, clicked: 15 },
  { date: 'Jan 16', sent: 150, opened: 75, clicked: 22 },
  { date: 'Jan 17', sent: 200, opened: 100, clicked: 30 },
  { date: 'Jan 18', sent: 250, opened: 125, clicked: 37 },
  { date: 'Jan 19', sent: 300, opened: 150, clicked: 45 },
  { date: 'Jan 20', sent: 250, opened: 125, clicked: 38 },
]

function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)

  // Fetch campaign from API
  const { data: campaignResponse, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      try {
        const response = await campaignsApi.getCampaign(id!)
        return response.data
      } catch (error) {
        // If API fails, try to find campaign in mock data (if enabled)
        console.log('API fetch failed')
        if (MOCK_DATA_CONFIG.USE_MOCK_DATA) {
          const mockCampaign = mockCampaigns.find(c => c.id === Number(id))
          return mockCampaign || null
        }
        return null
      }
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
      opened: campaignResponse.opens || 0,
      clicked: campaignResponse.clicks || 0,
      converted: campaignResponse.conversions || 0,
      fullContent: campaignResponse.content || '',
    }
  }, [campaignResponse, id])

  const [editForm, setEditForm] = useState(campaignData)

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

  const handleStatusToggle = () => {
    const newStatus = campaignData.status === 'active' ? 'paused' : 'active'
    updateCampaignMutation.mutate({ status: newStatus })
  }

  const handleEditClick = () => {
    setEditForm(campaignData)
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    updateCampaignMutation.mutate({
      name: editForm.name,
      type: editForm.type as 'email' | 'sms' | 'phone',
      status: editForm.status as 'draft' | 'scheduled' | 'active' | 'paused' | 'completed',
      subject: editForm.subject || undefined,
      content: editForm.fullContent || undefined,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="success">{campaign.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {campaign.startDate} - {campaign.endDate}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleStatusToggle}>
            <Pause className="mr-2 h-4 w-4" />
            {campaign.status === 'active' ? 'Pause' : 'Resume'}
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
            <div className="text-2xl font-bold">{campaign.sent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.opened.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{campaign.clicked.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{campaign.converted}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
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
              {campaign.content}
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
                <div dangerouslySetInnerHTML={{ __html: campaign.fullContent }} />
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
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'email' | 'sms' | 'phone' | 'social' })}
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="phone">Phone</option>
                        <option value="social">Social Media</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'paused' | 'completed' | 'draft' | 'scheduled' })}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
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
