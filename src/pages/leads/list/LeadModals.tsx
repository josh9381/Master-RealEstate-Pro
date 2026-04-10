import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { X, Send, Tag as TagIcon, FileText, Loader2 } from 'lucide-react'
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Lead } from '@/types'
import type { AssignedUser, TeamMember } from '@/types'
import { useConfirm } from '@/hooks/useConfirm'
import { tagsApi } from '@/lib/api'

// ── Mass Email Modal ──

interface MassEmailModalProps {
  selectedCount: number
  isSending: boolean
  onClose: () => void
  onSend: (data: { subject: string; body: string; template: string }) => void
}

export function MassEmailModal({
  selectedCount, isSending, onClose, onSend,
}: MassEmailModalProps) {
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [emailErrors, setEmailErrors] = useState<{ subject?: string; body?: string }>({})

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template)
    if (template === 'welcome') {
      setEmailSubject('Welcome to Our Platform!')
      setEmailBody('Hi {{name}},\n\nWe\'re excited to have you on board!\n\nBest regards,\nThe Team')
    } else if (template === 'followup') {
      setEmailSubject('Following up on our conversation')
      setEmailBody('Hi {{name}},\n\nI wanted to follow up on our recent discussion about {{company}}.\n\nLooking forward to hearing from you!\n\nBest,')
    } else if (template === 'proposal') {
      setEmailSubject('Custom Proposal for {{company}}')
      setEmailBody('Hi {{name}},\n\nAttached is a custom proposal tailored for {{company}}.\n\nPlease let me know if you have any questions.\n\nBest regards,')
    }
    setEmailErrors({})
  }

  const handleSend = () => {
    const errors: { subject?: string; body?: string } = {}
    if (!emailSubject.trim()) errors.subject = 'Subject is required'
    if (!emailBody.trim()) errors.body = 'Message is required'
    if (Object.keys(errors).length > 0) { setEmailErrors(errors); return }
    onSend({ subject: emailSubject, body: emailBody, template: selectedTemplate })
  }
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="mass-email-title" className="text-2xl font-bold">Send Mass Email</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Template (Optional)</label>
            <select
              className="w-full mt-1 p-2 border rounded-md"
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
            >
              <option value="">Select a template...</option>
              <option value="welcome">Welcome Email</option>
              <option value="followup">Follow-up Email</option>
              <option value="proposal">Proposal Email</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Subject *</label>
            <Input
              placeholder="Email subject..."
              value={emailSubject}
              onChange={(e) => {
                setEmailSubject(e.target.value)
                if (emailErrors.subject) setEmailErrors(prev => ({ ...prev, subject: undefined }))
              }}
              className={`mt-1 ${emailErrors.subject ? 'border-destructive' : ''}`}
            />
            {emailErrors.subject && (
              <p className="text-xs text-destructive mt-1">{emailErrors.subject}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Message *</label>
            <textarea
              className={`w-full mt-1 p-2 border rounded-md min-h-[200px] ${emailErrors.body ? 'border-destructive' : ''}`}
              placeholder="Email body..."
              value={emailBody}
              onChange={(e) => {
                setEmailBody(e.target.value)
                if (emailErrors.body) setEmailErrors(prev => ({ ...prev, body: undefined }))
              }}
            />
            {emailErrors.body && (
              <p className="text-xs text-destructive mt-1">{emailErrors.body}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Sending to {selectedCount} leads
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Tags Modal ──

interface TagsModalProps {
  onClose: () => void
  onApply: (tags: string[]) => void
}

export function TagsModal({
  onClose, onApply,
}: TagsModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Fetch tags from API instead of using hardcoded list
  const { data: tagsResponse, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getTags(),
  })
  const availableTags: string[] = (() => {
    const raw = tagsResponse?.data?.tags || tagsResponse?.data || tagsResponse?.tags || tagsResponse || []
    if (!Array.isArray(raw)) return []
    return raw.map((t: { name: string }) => t.name).filter(Boolean)
  })()

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleAddNewTag = () => {
    if (newTag.trim()) { setSelectedTags(prev => [...prev, newTag.trim()]); setNewTag('') }
  }
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 id="tags-title" className="text-xl font-bold">Add Tags</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Tags</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tagsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tags...
                </div>
              ) : availableTags.length > 0 ? (
                availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleToggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags found. Add a new tag below.</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Add New Tag</label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <Button variant="outline" onClick={handleAddNewTag}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onApply(selectedTags)} disabled={selectedTags.length === 0}>
              <TagIcon className="mr-2 h-4 w-4" />
              Apply Tags
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Status Change Modal ──

interface StatusModalProps {
  onClose: () => void
  onApply: (status: string) => void
}

export function StatusModal({ onClose, onApply }: StatusModalProps) {
  const [newStatus, setNewStatus] = useState('')
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 id="status-title" className="text-xl font-bold">Change Status</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">New Status</label>
            <select
              className="w-full mt-1 p-2 border rounded-md"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">Select status...</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onApply(newStatus)}>
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Assign To Modal ──

interface AssignModalProps {
  teamMembers: TeamMember[]
  onClose: () => void
  onApply: (userId: string) => void
}

export function AssignModal({ teamMembers, onClose, onApply }: AssignModalProps) {
  const [assignToUser, setAssignToUser] = useState('')
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 id="assign-title" className="text-xl font-bold">Assign Leads</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Assign To</label>
            <select
              className="w-full mt-1 p-2 border rounded-md"
              value={assignToUser}
              onChange={(e) => setAssignToUser(e.target.value)}
            >
              <option value="">Select user...</option>
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))
              ) : (
                <option value="" disabled>No team members available</option>
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onApply(assignToUser)}>
              Assign Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Bulk Delete Modal ──

interface BulkDeleteModalProps {
  selectedCount: number
  onClose: () => void
  onDelete: () => void
}

export function BulkDeleteModal({ selectedCount, onClose, onDelete }: BulkDeleteModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 id="delete-title" className="text-xl font-bold text-destructive">Delete Leads</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm">
            Are you sure you want to delete {selectedCount} lead(s)? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Lead Modal ──

interface EditLeadModalProps {
  editingLead: Lead
  editErrors: Record<string, string>
  teamMembers: TeamMember[]
  onClose: () => void
  onLeadChange: (lead: Lead) => void
  onSave: () => void
}

export function EditLeadModal({ editingLead, editErrors, teamMembers, onClose, onLeadChange, onSave }: EditLeadModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'realestate' | 'address'>('basic')
  const showConfirm = useConfirm()
  const initialLeadRef = useRef(JSON.stringify(editingLead))

  const isDirty = JSON.stringify(editingLead) !== initialLeadRef.current

  const handleClose = async () => {
    if (isDirty) {
      const confirmed = await showConfirm({ title: 'Discard Changes?', message: 'You have unsaved changes. Are you sure you want to close?' })
      if (!confirmed) return
    }
    onClose()
  }

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'realestate' as const, label: 'Real Estate' },
    { id: 'address' as const, label: 'Address' },
  ]

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-lead-title" className="text-2xl font-bold">Edit Lead</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* Tab 1: Basic Info */}
          {activeTab === 'basic' && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name *</label>
                    <Input value={editingLead.firstName} onChange={(e) => onLeadChange({...editingLead, firstName: e.target.value})} className="mt-1" placeholder="John" />
                    {editErrors.firstName && <p className="text-sm text-destructive mt-1">{editErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input value={editingLead.lastName} onChange={(e) => onLeadChange({...editingLead, lastName: e.target.value})} className="mt-1" placeholder="Doe" />
                    {editErrors.lastName && <p className="text-sm text-destructive mt-1">{editErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input type="email" value={editingLead.email} onChange={(e) => onLeadChange({...editingLead, email: e.target.value})} className="mt-1" placeholder="john@example.com" />
                    {editErrors.email && <p className="text-sm text-destructive mt-1">{editErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={editingLead.phone} onChange={(e) => onLeadChange({...editingLead, phone: e.target.value})} className="mt-1" placeholder="+1 (555) 123-4567" />
                    {editErrors.phone && <p className="text-sm text-destructive mt-1">{editErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Input value={editingLead.company} onChange={(e) => onLeadChange({...editingLead, company: e.target.value})} className="mt-1" placeholder="Acme Inc" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Job Title</label>
                    <Input value={editingLead.position || ''} onChange={(e) => onLeadChange({...editingLead, position: e.target.value})} className="mt-1" placeholder="CEO, Manager, etc." />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deal Value ($)</label>
                    <Input type="number" value={editingLead.value || ''} onChange={(e) => onLeadChange({...editingLead, value: parseInt(e.target.value) || 0})} className="mt-1" placeholder="50000" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select className="w-full mt-1 p-2 border rounded-md" value={editingLead.status} onChange={(e) => onLeadChange({...editingLead, status: e.target.value as Lead['status']})}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <select className="w-full mt-1 p-2 border rounded-md capitalize" value={editingLead.source} onChange={(e) => onLeadChange({...editingLead, source: e.target.value})}>
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
                    <Input type="number" min="0" max="100" value={editingLead.score} onChange={(e) => onLeadChange({...editingLead, score: parseInt(e.target.value) || 0})} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={typeof editingLead.assignedTo === 'object' && editingLead.assignedTo !== null ? (editingLead.assignedTo as AssignedUser).id || (editingLead.assignedTo as AssignedUser)._id || '' : editingLead.assignedTo || ''}
                      onChange={(e) => onLeadChange({...editingLead, assignedTo: e.target.value || null})}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>
                        ))
                      ) : (
                        <option value="" disabled>No team members available</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md min-h-[100px]"
                  value={typeof editingLead.notes === 'string' ? editingLead.notes : ''}
                  onChange={(e) => onLeadChange({...editingLead, notes: e.target.value})}
                  placeholder="Add any additional notes about this lead..."
                />
              </div>
            </>
          )}

          {/* Tab 2: Real Estate */}
          {activeTab === 'realestate' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Real Estate Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Property Type</label>
                  <select className="w-full mt-1 p-2 border rounded-md" value={editingLead.propertyType || ''} onChange={(e) => onLeadChange({...editingLead, propertyType: e.target.value})}>
                    <option value="">Not specified</option>
                    <option value="Single Family">Single Family</option>
                    <option value="Condo">Condo</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Multi-Family">Multi-Family</option>
                    <option value="Land">Land</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Transaction Type</label>
                  <select className="w-full mt-1 p-2 border rounded-md" value={editingLead.transactionType || ''} onChange={(e) => onLeadChange({...editingLead, transactionType: e.target.value})}>
                    <option value="">Not specified</option>
                    <option value="Buyer">Buyer</option>
                    <option value="Seller">Seller</option>
                    <option value="Both">Both (Buy + Sell)</option>
                    <option value="Investor">Investor</option>
                    <option value="Renter">Renter</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Budget Min ($)</label>
                  <Input type="number" value={editingLead.budgetMin || ''} onChange={(e) => onLeadChange({...editingLead, budgetMin: parseFloat(e.target.value) || undefined})} className="mt-1" placeholder="200000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Budget Max ($)</label>
                  <Input type="number" value={editingLead.budgetMax || ''} onChange={(e) => onLeadChange({...editingLead, budgetMax: parseFloat(e.target.value) || undefined})} className="mt-1" placeholder="500000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Pre-Approval Status</label>
                  <select className="w-full mt-1 p-2 border rounded-md" value={editingLead.preApprovalStatus || ''} onChange={(e) => onLeadChange({...editingLead, preApprovalStatus: e.target.value})}>
                    <option value="">Not specified</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In-Process">In-Process</option>
                    <option value="Pre-Approved">Pre-Approved</option>
                    <option value="Cash Buyer">Cash Buyer</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Move-In Timeline</label>
                  <select className="w-full mt-1 p-2 border rounded-md" value={editingLead.moveInTimeline || ''} onChange={(e) => onLeadChange({...editingLead, moveInTimeline: e.target.value})}>
                    <option value="">Not specified</option>
                    <option value="ASAP">ASAP</option>
                    <option value="1-3 Months">1-3 Months</option>
                    <option value="3-6 Months">3-6 Months</option>
                    <option value="6-12 Months">6-12 Months</option>
                    <option value="Just Browsing">Just Browsing</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Desired Location</label>
                  <Input value={editingLead.desiredLocation || ''} onChange={(e) => onLeadChange({...editingLead, desiredLocation: e.target.value})} className="mt-1" placeholder="City, neighborhood, or zip code" />
                </div>
                <div>
                  <label className="text-sm font-medium">Min Bedrooms</label>
                  <Input type="number" min="0" value={editingLead.bedsMin || ''} onChange={(e) => onLeadChange({...editingLead, bedsMin: parseInt(e.target.value) || undefined})} className="mt-1" placeholder="3" />
                </div>
                <div>
                  <label className="text-sm font-medium">Min Bathrooms</label>
                  <Input type="number" min="0" value={editingLead.bathsMin || ''} onChange={(e) => onLeadChange({...editingLead, bathsMin: parseInt(e.target.value) || undefined})} className="mt-1" placeholder="2" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Address */}
          {activeTab === 'address' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Address Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input
                    value={editingLead.customFields?.address?.street || ''}
                    onChange={(e) => onLeadChange({ ...editingLead, customFields: { ...editingLead.customFields, address: {...editingLead.customFields?.address, street: e.target.value} } })}
                    className="mt-1" placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={editingLead.customFields?.address?.city || ''}
                    onChange={(e) => onLeadChange({ ...editingLead, customFields: { ...editingLead.customFields, address: {...editingLead.customFields?.address, city: e.target.value} } })}
                    className="mt-1" placeholder="New York"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">State/Province</label>
                  <Input
                    value={editingLead.customFields?.address?.state || ''}
                    onChange={(e) => onLeadChange({ ...editingLead, customFields: { ...editingLead.customFields, address: {...editingLead.customFields?.address, state: e.target.value} } })}
                    className="mt-1" placeholder="NY"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ZIP/Postal Code</label>
                  <Input
                    value={editingLead.customFields?.address?.zip || ''}
                    onChange={(e) => onLeadChange({ ...editingLead, customFields: { ...editingLead.customFields, address: {...editingLead.customFields?.address, zip: e.target.value} } })}
                    className="mt-1" placeholder="10001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    value={editingLead.customFields?.address?.country || ''}
                    onChange={(e) => onLeadChange({ ...editingLead, customFields: { ...editingLead.customFields, address: {...editingLead.customFields?.address, country: e.target.value} } })}
                    className="mt-1" placeholder="United States"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              <FileText className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
