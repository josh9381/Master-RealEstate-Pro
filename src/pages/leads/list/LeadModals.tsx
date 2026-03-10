import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { X, Send, Tag as TagIcon, FileText } from 'lucide-react'
import type { Lead } from '@/types'
import type { AssignedUser, TeamMember } from '@/types'

// ── Mass Email Modal ──

interface MassEmailModalProps {
  selectedCount: number
  emailSubject: string
  emailBody: string
  selectedTemplate: string
  emailErrors: { subject?: string; body?: string }
  isSending: boolean
  onClose: () => void
  onSubjectChange: (value: string) => void
  onBodyChange: (value: string) => void
  onTemplateSelect: (template: string) => void
  onSend: () => void
  onClearErrors: (field: 'subject' | 'body') => void
}

export function MassEmailModal({
  selectedCount, emailSubject, emailBody, selectedTemplate,
  emailErrors, isSending, onClose, onSubjectChange, onBodyChange,
  onTemplateSelect, onSend, onClearErrors,
}: MassEmailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="mass-email-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
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
              onChange={(e) => onTemplateSelect(e.target.value)}
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
                onSubjectChange(e.target.value)
                if (emailErrors.subject) onClearErrors('subject')
              }}
              className={`mt-1 ${emailErrors.subject ? 'border-red-500' : ''}`}
            />
            {emailErrors.subject && (
              <p className="text-xs text-red-500 mt-1">{emailErrors.subject}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Message *</label>
            <textarea
              className={`w-full mt-1 p-2 border rounded-md min-h-[200px] ${emailErrors.body ? 'border-red-500' : ''}`}
              placeholder="Email body..."
              value={emailBody}
              onChange={(e) => {
                onBodyChange(e.target.value)
                if (emailErrors.body) onClearErrors('body')
              }}
            />
            {emailErrors.body && (
              <p className="text-xs text-red-500 mt-1">{emailErrors.body}</p>
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
              <Button onClick={onSend} disabled={isSending}>
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
      </Card>
    </div>
  )
}

// ── Tags Modal ──

interface TagsModalProps {
  selectedTags: string[]
  newTag: string
  onClose: () => void
  onToggleTag: (tag: string) => void
  onNewTagChange: (value: string) => void
  onAddNewTag: () => void
  onApply: () => void
}

export function TagsModal({
  selectedTags, newTag, onClose, onToggleTag,
  onNewTagChange, onAddNewTag, onApply,
}: TagsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="tags-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md p-6 m-4">
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
              {['Hot Lead', 'Enterprise', 'VIP', 'Follow-up', 'Demo Scheduled', 'Proposal Sent'].map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onToggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Add New Tag</label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Tag name..."
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
              />
              <Button variant="outline" onClick={onAddNewTag}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onApply} disabled={selectedTags.length === 0}>
              <TagIcon className="mr-2 h-4 w-4" />
              Apply Tags
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Status Change Modal ──

interface StatusModalProps {
  newStatus: string
  onClose: () => void
  onStatusChange: (value: string) => void
  onApply: () => void
}

export function StatusModal({ newStatus, onClose, onStatusChange, onApply }: StatusModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="status-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md p-6 m-4">
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
              onChange={(e) => onStatusChange(e.target.value)}
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
            <Button onClick={onApply}>
              Update Status
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Assign To Modal ──

interface AssignModalProps {
  assignToUser: string
  teamMembers: TeamMember[]
  onClose: () => void
  onAssignChange: (value: string) => void
  onApply: () => void
}

export function AssignModal({ assignToUser, teamMembers, onClose, onAssignChange, onApply }: AssignModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="assign-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md p-6 m-4">
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
              onChange={(e) => onAssignChange(e.target.value)}
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
            <Button onClick={onApply}>
              Assign Leads
            </Button>
          </div>
        </div>
      </Card>
    </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 id="delete-title" className="text-xl font-bold text-red-600">Delete Leads</h2>
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
      </Card>
    </div>
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
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-lead-title" className="text-2xl font-bold">Edit Lead</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    value={editingLead.firstName}
                    onChange={(e) => onLeadChange({...editingLead, firstName: e.target.value})}
                    className="mt-1"
                    placeholder="John"
                  />
                  {editErrors.firstName && <p className="text-sm text-red-500 mt-1">{editErrors.firstName}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    value={editingLead.lastName}
                    onChange={(e) => onLeadChange({...editingLead, lastName: e.target.value})}
                    className="mt-1"
                    placeholder="Doe"
                  />
                  {editErrors.lastName && <p className="text-sm text-red-500 mt-1">{editErrors.lastName}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Position/Title</label>
                <Input
                  value={editingLead.position || ''}
                  onChange={(e) => onLeadChange({...editingLead, position: e.target.value})}
                  className="mt-1"
                  placeholder="CEO, Manager, etc."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={editingLead.email}
                  onChange={(e) => onLeadChange({...editingLead, email: e.target.value})}
                  className="mt-1"
                  placeholder="john@example.com"
                />
                {editErrors.email && <p className="text-sm text-red-500 mt-1">{editErrors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editingLead.phone}
                  onChange={(e) => onLeadChange({...editingLead, phone: e.target.value})}
                  className="mt-1"
                  placeholder="+1 (555) 123-4567"
                />
                {editErrors.phone && <p className="text-sm text-red-500 mt-1">{editErrors.phone}</p>}
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
                  onChange={(e) => onLeadChange({...editingLead, company: e.target.value})}
                  className="mt-1"
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Industry</label>
                <Input
                  value={editingLead.customFields?.industry || ''}
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({
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
                  onChange={(e) => onLeadChange({...editingLead, status: e.target.value as Lead['status']})}
                >
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
                <select
                  className="w-full mt-1 p-2 border rounded-md capitalize"
                  value={editingLead.source}
                  onChange={(e) => onLeadChange({...editingLead, source: e.target.value})}
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
                  onChange={(e) => onLeadChange({...editingLead, score: parseInt(e.target.value) || 0})}
                  className="mt-1"
                />
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
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No team members available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Deal Value ($)</label>
                <Input
                  type="number"
                  value={editingLead.value || ''}
                  onChange={(e) => onLeadChange({...editingLead, value: parseInt(e.target.value) || 0})}
                  className="mt-1"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Budget ($)</label>
                <Input
                  type="number"
                  value={editingLead.customFields?.budget || ''}
                  onChange={(e) => onLeadChange({
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
              onChange={(e) => onLeadChange({...editingLead, notes: e.target.value})}
              placeholder="Add any additional notes about this lead..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              <FileText className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
