import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Mail, Phone, Building, Calendar, Edit, Trash2, MessageSquare, FileText, X } from 'lucide-react'
import { AIEmailComposer } from '@/components/ai/AIEmailComposer'
import { AISMSComposer } from '@/components/ai/AISMSComposer'
import { AISuggestedActions } from '@/components/ai/AISuggestedActions'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { Lead } from '@/types'
import { useToast } from '@/hooks/useToast'
import { leadsApi, UpdateLeadData } from '@/lib/api'
import { mockLeads } from '@/data/mockData'

function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [showSMSComposer, setShowSMSComposer] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // Fetch lead details from API
  const { data: leadResponse, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      try {
        const response = await leadsApi.getLead(id!)
        return response.data
      } catch (error) {
        // If API fails, try to find lead in mock data
        console.log('API fetch failed, using mock data')
        const mockLead = mockLeads.find(lead => lead.id === Number(id))
        return mockLead || null
      }
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      leadsApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead updated successfully')
    },
    onError: () => {
      toast.error('Failed to update lead')
    },
  })

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      toast.success('Lead deleted successfully')
      navigate('/leads')
    },
    onError: () => {
      toast.error('Failed to delete lead')
    },
  })

  const lead = leadResponse as Lead | undefined

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-1/3 mb-2" />
          <div className="h-6 bg-muted rounded w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Show error if lead not found
  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Lead not found</h2>
        <p className="text-muted-foreground mb-4">The lead you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/leads')}>Back to Leads</Button>
      </div>
    )
  }

  const notes = [
    { id: 1, content: 'Very interested in our enterprise features. Mentioned they need better analytics.', author: 'Sarah', date: '2024-01-19' },
    { id: 2, content: 'Budget approved. Ready to move forward with demo.', author: 'Mike', date: '2024-01-18' },
  ]

  const handleEditLead = () => {
    setEditingLead(lead)
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (editingLead && id) {
      const updateData: UpdateLeadData = {
        name: editingLead.name,
        email: editingLead.email,
        phone: editingLead.phone,
        company: editingLead.company,
        status: editingLead.status,
        source: editingLead.source,
        score: editingLead.score,
        assignedTo: editingLead.assignedTo || undefined,
        tags: editingLead.tags,
      }
      
      updateLeadMutation.mutate({
        id: id,
        data: updateData
      })
      setShowEditModal(false)
      setEditingLead(null)
    }
  }

  const handleDeleteLead = () => {
    if (id && window.confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          <p className="mt-2 text-muted-foreground">{lead.position} at {lead.company}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditLead}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDeleteLead}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Actions with AI */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button onClick={() => setShowEmailComposer(true)} className="h-auto flex-col py-4">
          <Mail className="mb-2 h-6 w-6" />
          <span className="font-medium">Email</span>
          <span className="text-xs opacity-75">✨ AI-powered</span>
        </Button>
        <Button onClick={() => setShowSMSComposer(true)} variant="outline" className="h-auto flex-col py-4">
          <MessageSquare className="mb-2 h-6 w-6" />
          <span className="font-medium">SMS</span>
          <span className="text-xs opacity-75">✨ AI-powered</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col py-4">
          <Phone className="mb-2 h-6 w-6" />
          <span className="font-medium">Call</span>
          <span className="text-xs opacity-75">Quick dial</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">{lead.company}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">{lead.createdAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline leadName={lead.name} />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notes</CardTitle>
                <Button size="sm">Add Note</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-4">
                    <p className="text-sm">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{note.author}</span>
                      <span>{note.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Suggested Actions */}
          <AISuggestedActions />

          {/* Lead Score */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{lead.score}</div>
                <p className="mt-2 text-sm text-muted-foreground">High quality lead</p>
              </div>
            </CardContent>
          </Card>

          {/* Status & Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant="success" className="mt-1">{lead.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="mt-1 text-sm text-muted-foreground">{lead.source}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Assigned To</p>
                <p className="mt-1 text-sm text-muted-foreground">{lead.assignedTo}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(lead.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Composers - Modals */}
      <AIEmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        leadName={lead.name}
        leadEmail={lead.email}
      />
      <AISMSComposer
        isOpen={showSMSComposer}
        onClose={() => setShowSMSComposer(false)}
        leadName={lead.name.split(' ')[0]}
        leadPhone={lead.phone}
      />

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
    </div>
  )
}

export default LeadDetail
