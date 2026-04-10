import { useState } from 'react'
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  FileText,
  Sparkles,
  Clock,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AIComposer } from '@/components/ai/AIComposer'
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary'
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
  templates: { id: string; name: string; content: string }[]
  onTypeChange: (type: 'email' | 'sms' | 'call') => void
  onToChange: (to: string) => void
  onSubjectChange: (subject: string) => void
  onBodyChange: (body: string) => void
  onLeadChange: (leadId: string) => void
  onEnhance: (body: string, tone: string) => Promise<string>
  onSend: (scheduledAt?: string) => void
  onClose: () => void
}

export const ComposeModal = ({
  composeType,
  composeTo,
  composeSubject,
  composeBody,
  composeLeadId,
  leads,
  templates,
  onTypeChange,
  onToChange,
  onSubjectChange,
  onBodyChange,
  onLeadChange,
  onEnhance,
  onSend,
  onClose,
}: ComposeModalProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAIComposer, setShowAIComposer] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

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

  const handleScheduleSend = () => {
    if (!validate()) return
    if (!scheduleDate || !scheduleTime) return
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
    onSend(scheduledAt)
  }

  const applyQuickSchedule = (daysAhead: number, time: string) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    setScheduleDate(d.toISOString().split('T')[0])
    setScheduleTime(time)
  }

  const handleMessageGenerated = (message: string, subject?: string) => {
    onBodyChange(message)
    if (subject && composeType === 'email') onSubjectChange(subject)
    setShowAIComposer(false)
  }

  const handleEnhance = async () => {
    if (composeBody.length < 10) return
    setEnhancing(true)
    try {
      const enhanced = await onEnhance(composeBody, 'professional')
      onBodyChange(enhanced)
    } finally {
      setEnhancing(false)
    }
  }

  // Filter templates by type: email templates for email, SMS templates for sms
  const filteredTemplates = templates.filter(t => {
    // Templates with short content (< 300 chars) are likely SMS templates
    if (composeType === 'sms') return t.content.length < 300
    if (composeType === 'email') return t.content.length >= 50
    return true
  })

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
                className={errors.to ? 'border-destructive' : ''}
              />
              {errors.to && <p className="text-xs text-destructive">{errors.to}</p>}
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
                  className={errors.subject ? 'border-destructive' : ''}
                  maxLength={300}
                />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>

              {/* AI & Template toolbar */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={composeBody.length > 10 ? 'outline' : 'default'}
                  onClick={() => setShowAIComposer(true)}
                  type="button"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate with AI
                </Button>
                <Button
                  size="sm"
                  variant={composeBody.length > 10 ? 'default' : 'outline'}
                  onClick={handleEnhance}
                  disabled={composeBody.length < 10 || enhancing}
                  type="button"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
                <div className="relative">
                  <Button size="sm" variant="outline" onClick={() => setShowTemplates(!showTemplates)} type="button">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Templates
                  </Button>
                  {showTemplates && (
                    <Card className="absolute bottom-full left-0 mb-2 w-64 z-20 shadow-lg max-h-48 overflow-y-auto">
                      <CardContent className="p-2">
                        {filteredTemplates.length > 0 ? (
                          <div className="space-y-1">
                            {filteredTemplates.map((template) => (
                              <Button
                                key={template.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-left text-xs"
                                onClick={() => { onBodyChange(template.content); setShowTemplates(false) }}
                              >
                                {template.name}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground p-2">No templates for this type</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* AI Composer */}
              {showAIComposer && composeType !== 'call' && (
                <ModalErrorBoundary>
                  <AIComposer
                    leadId={composeLeadId || ''}
                    conversationId=""
                    messageType={composeType}
                    onMessageGenerated={handleMessageGenerated}
                    onClose={() => setShowAIComposer(false)}
                  />
                </ModalErrorBoundary>
              )}

              <textarea
                value={composeBody}
                onChange={(e) => { onBodyChange(e.target.value); setErrors(prev => ({ ...prev, body: '' })) }}
                rows={8}
                className={`w-full p-3 border rounded-md resize-none ${errors.body ? 'border-destructive' : ''}`}
                placeholder={composeType === 'call' ? 'Enter call notes...' : 'Enter your message...'}
              />
              {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
              {composeType === 'sms' && (
                <p className={`text-xs ${composeBody.length > 480 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                  {(() => { const seg = calculateSMSSegments(composeBody); return `${seg.charCount} chars (${seg.encoding}) \u2022 ${seg.segmentCount} segment${seg.segmentCount !== 1 ? 's' : ''}` })()}
                  {calculateSMSSegments(composeBody).segmentCount > 1 && ` \u26a0\ufe0f (${calculateSMSSegments(composeBody).segmentCount}x SMS cost)`}
                  {composeBody.length > 480 && ' \u2014 consider email instead'}
                  {' \u2022 Max 1600'}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>

              {/* Schedule Send */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduler(!showScheduler)}
                  type="button"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {scheduleDate && scheduleTime
                    ? `Scheduled: ${scheduleDate} ${scheduleTime}`
                    : 'Schedule'}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
                {showScheduler && (
                  <Card className="absolute bottom-full right-0 mb-2 w-80 z-20 shadow-xl">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-medium">Schedule Send</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Date</label>
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-2 py-1.5 border rounded text-sm bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Time</label>
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded text-sm bg-background"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" onClick={() => applyQuickSchedule(0, '17:00')} className="px-2 py-1 text-[11px] rounded border hover:bg-accent text-muted-foreground">Today 5pm</button>
                        <button type="button" onClick={() => applyQuickSchedule(1, '09:00')} className="px-2 py-1 text-[11px] rounded border hover:bg-accent text-muted-foreground">Tomorrow 9am</button>
                        <button type="button" onClick={() => applyQuickSchedule(1, '14:00')} className="px-2 py-1 text-[11px] rounded border hover:bg-accent text-muted-foreground">Tomorrow 2pm</button>
                        <button type="button" onClick={() => { const d = new Date(); const daysUntilMon = (8 - d.getDay()) % 7 || 7; applyQuickSchedule(daysUntilMon, '09:00') }} className="px-2 py-1 text-[11px] rounded border hover:bg-accent text-muted-foreground">Next Monday</button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { handleScheduleSend(); setShowScheduler(false) }} disabled={!scheduleDate || !scheduleTime}>
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          Schedule
                        </Button>
                        {scheduleDate && (
                          <Button size="sm" variant="ghost" onClick={() => { setScheduleDate(''); setScheduleTime(''); }}>
                            Clear
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

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
