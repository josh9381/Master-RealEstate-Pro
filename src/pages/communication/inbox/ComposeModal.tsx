import { useState } from 'react'
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { calculateSMSSegments } from '@/utils/smsSegments'
import type { InboxLead } from './types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/

interface ComposeModalProps {
  composeType: 'email' | 'sms' | 'call'
  composeTo: string
  composeSubject: string
  composeBody: string
  composeLeadId: string
  leads: InboxLead[]
  onTypeChange: (type: 'email' | 'sms' | 'call') => void
  onToChange: (to: string) => void
  onSubjectChange: (subject: string) => void
  onBodyChange: (body: string) => void
  onLeadChange: (leadId: string) => void
  onSend: () => void
  onClose: () => void
}

export const ComposeModal = ({
  composeType,
  composeTo,
  composeSubject,
  composeBody,
  composeLeadId,
  leads,
  onTypeChange,
  onToChange,
  onSubjectChange,
  onBodyChange,
  onLeadChange,
  onSend,
  onClose,
}: ComposeModalProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!composeTo.trim()) {
      errs.to = 'Recipient is required'
    } else if (composeType === 'email' && !EMAIL_REGEX.test(composeTo.trim())) {
      errs.to = 'Invalid email address'
    } else if (composeType === 'sms' && !PHONE_REGEX.test(composeTo.replace(/[\s()-]/g, ''))) {
      errs.to = 'Invalid phone number. Use E.164 format (e.g., +1234567890)'
    }
    if (composeType === 'email' && !composeSubject.trim()) {
      errs.subject = 'Subject is required'
    }
    if (!composeBody.trim()) {
      errs.body = 'Message body is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSend = () => {
    if (validate()) onSend()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="compose-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-2xl mx-4" tabIndex={-1}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="compose-dialog-title" className="text-lg font-semibold">Compose New Message</h3>
              <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2">
                <Button size="sm" variant={composeType === 'email' ? 'default' : 'outline'} onClick={() => onTypeChange('email')}>
                  <Mail className="mr-2 h-4 w-4" />Email
                </Button>
                <Button size="sm" variant={composeType === 'sms' ? 'default' : 'outline'} onClick={() => onTypeChange('sms')}>
                  <MessageSquare className="mr-2 h-4 w-4" />SMS
                </Button>
                <Button size="sm" variant={composeType === 'call' ? 'default' : 'outline'} onClick={() => onTypeChange('call')}>
                  <Phone className="mr-2 h-4 w-4" />Call Note
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Lead (Optional)</label>
              <select
                className="w-full p-2 border rounded-md"
                value={composeLeadId}
                onChange={(e) => onLeadChange(e.target.value)}
              >
                <option value="">-- Select a lead or enter manually below --</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName} ({composeType === 'email' ? lead.email : lead.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {composeType === 'email' ? 'To (Email)' : composeType === 'sms' ? 'To (Phone)' : 'Contact'}
              </label>
              <Input
                placeholder={composeType === 'email' ? 'recipient@example.com' : composeType === 'sms' ? '+1 (555) 123-4567' : 'Contact name'}
                value={composeTo}
                onChange={(e) => { onToChange(e.target.value); setErrors(prev => ({ ...prev, to: '' })) }}
                className={errors.to ? 'border-red-500' : ''}
              />
              {errors.to && <p className="text-xs text-red-500">{errors.to}</p>}
              <p className="text-xs text-muted-foreground">
                {composeLeadId ? 'Auto-filled from selected lead. You can edit if needed.' : 'Or enter recipient manually'}
              </p>
            </div>

            {composeType === 'email' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter subject..."
                  value={composeSubject}
                  onChange={(e) => { onSubjectChange(e.target.value); setErrors(prev => ({ ...prev, subject: '' })) }}
                  className={errors.subject ? 'border-red-500' : ''}
                  maxLength={300}
                />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={composeBody}
                onChange={(e) => { onBodyChange(e.target.value); setErrors(prev => ({ ...prev, body: '' })) }}
                rows={8}
                className={`w-full p-3 border rounded-md resize-none ${errors.body ? 'border-red-500' : ''}`}
                placeholder={composeType === 'call' ? 'Enter call notes...' : 'Enter your message...'}
              />
              {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
              {composeType === 'sms' && (
                <p className={`text-xs ${composeBody.length > 480 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                  {(() => { const seg = calculateSMSSegments(composeBody); return `${seg.charCount} chars (${seg.encoding}) \u2022 ${seg.segmentCount} segment${seg.segmentCount !== 1 ? 's' : ''}` })()}
                  {calculateSMSSegments(composeBody).segmentCount > 1 && ` \u26a0\ufe0f (${calculateSMSSegments(composeBody).segmentCount}x SMS cost)`}
                  {composeBody.length > 480 && ' \u2014 consider email instead'}
                  {' \u2022 Max 1600'}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" />
                Send {composeType === 'email' ? 'Email' : composeType === 'sms' ? 'SMS' : 'Note'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
