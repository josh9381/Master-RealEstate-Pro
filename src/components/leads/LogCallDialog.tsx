import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { callsApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

const CALL_OUTCOMES = [
  { value: 'ANSWERED', label: 'Answered', icon: '✅', description: 'Had a conversation' },
  { value: 'VOICEMAIL', label: 'Voicemail', icon: '📬', description: 'Went to voicemail' },
  { value: 'LEFT_MESSAGE', label: 'Left Message', icon: '💬', description: 'Left a voicemail' },
  { value: 'NO_ANSWER', label: 'No Answer', icon: '📵', description: 'No pickup, no voicemail' },
  { value: 'BUSY', label: 'Busy', icon: '🔴', description: 'Line was busy' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', icon: '❌', description: 'Number incorrect' },
  { value: 'CALLBACK_SCHEDULED', label: 'Callback Scheduled', icon: '📅', description: 'Asked to call back' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', icon: '👎', description: 'Lead declined' },
  { value: 'DNC_REQUEST', label: 'Do Not Call', icon: '🚫', description: 'DNC request' },
] as const

interface LogCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  leadPhone?: string
}

export function LogCallDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadPhone,
}: LogCallDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [direction, setDirection] = useState<'OUTBOUND' | 'INBOUND'>('OUTBOUND')
  const [outcome, setOutcome] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState(leadPhone || '')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [durationSeconds, setDurationSeconds] = useState('')
  const [notes, setNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  const resetForm = () => {
    setDirection('OUTBOUND')
    setOutcome('')
    setPhoneNumber(leadPhone || '')
    setDurationMinutes('')
    setDurationSeconds('')
    setNotes('')
    setFollowUpDate('')
  }

  const logCallMutation = useMutation({
    mutationFn: async () => {
      const totalSeconds =
        (parseInt(durationMinutes) || 0) * 60 + (parseInt(durationSeconds) || 0)

      return callsApi.logCall({
        leadId,
        phoneNumber: phoneNumber || 'Unknown',
        direction,
        outcome,
        duration: totalSeconds > 0 ? totalSeconds : undefined,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Call logged', `Call with ${leadName} logged successfully`)
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['lead-calls', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-messages', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-message-stats', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
      queryClient.invalidateQueries({ queryKey: ['call-stats'] })
      resetForm()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to log call', (error as Error & { response?: { data?: { message?: string } } })?.response?.data?.message || error.message || 'Something went wrong')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!outcome) {
      toast.error('Select an outcome', 'Please select what happened on the call')
      return
    }
    logCallMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Log Call — {leadName}
            </span>
          </DialogTitle>
          <DialogDescription>
            Record the details of your call with this lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Direction Toggle */}
          <div>
            <label className="text-sm font-medium mb-2 block">Direction</label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={direction === 'OUTBOUND' ? 'default' : 'outline'}
                onClick={() => setDirection('OUTBOUND')}
                className="flex-1"
              >
                <PhoneOutgoing className="h-4 w-4 mr-1.5" />
                Outbound
              </Button>
              <Button
                type="button"
                size="sm"
                variant={direction === 'INBOUND' ? 'default' : 'outline'}
                onClick={() => setDirection('INBOUND')}
                className="flex-1"
              >
                <PhoneIncoming className="h-4 w-4 mr-1.5" />
                Inbound
              </Button>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Outcome Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Outcome <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CALL_OUTCOMES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={`
                    flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-all hover:bg-accent
                    ${outcome === opt.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border'
                    }
                    ${opt.value === 'DNC_REQUEST' ? 'border-destructive/30 hover:border-destructive/50' : ''}
                  `}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="font-medium leading-tight text-center">{opt.label}</span>
                </button>
              ))}
            </div>
            {outcome === 'DNC_REQUEST' && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  This lead will be flagged as <strong>Do Not Call</strong>. They won't appear in call lists or phone campaigns.
                </span>
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Duration (optional)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="0"
                />
              </div>
              <span className="text-sm text-muted-foreground">min</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  placeholder="0"
                />
              </div>
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed? Any key takeaways?"
              rows={3}
              maxLength={5000}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Follow-up Date */}
          {(outcome === 'CALLBACK_SCHEDULED' || outcome === 'ANSWERED' || outcome === 'LEFT_MESSAGE') && (
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Follow-up Date
              </label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={logCallMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!outcome || logCallMutation.isPending}
            >
              {logCallMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Log Call
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
