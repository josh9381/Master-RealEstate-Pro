import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Bell,
  Plus,
  Clock,
  CheckCircle,
  Timer,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { remindersApi, type FollowUpReminder, type CreateReminderData } from '@/lib/api'
import { isPushSupported, isPushSubscribed, registerPush } from '@/lib/pushNotifications'

interface Props {
  leadId: string
  leadName: string
}

const QUICK_TIMES = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: 'Tomorrow 9 AM', minutes: -1 }, // Special case
  { label: '3 days', minutes: 60 * 24 * 3 },
  { label: '1 week', minutes: 60 * 24 * 7 },
]

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-muted text-foreground',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

function getTomorrow9AM(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

function formatDueDate(dueAt: string): string {
  const d = new Date(dueAt)
  const now = new Date()
  const diff = d.getTime() - now.getTime()

  if (diff < 0) {
    const mins = Math.abs(Math.round(diff / 60000))
    if (mins < 60) return `${mins}m overdue`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h overdue`
    return `${Math.round(hrs / 24)}d overdue`
  }

  if (diff < 60 * 60 * 1000) return `in ${Math.round(diff / 60000)}m`
  if (diff < 24 * 60 * 60 * 1000) return `in ${Math.round(diff / (60 * 60 * 1000))}h`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date()
}

export function FollowUpReminders({ leadId, leadName }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [title, setTitle] = useState(`Follow up with ${leadName}`)
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [channelInApp, setChannelInApp] = useState(true)
  const [channelEmail, setChannelEmail] = useState(false)
  const [channelSms, setChannelSms] = useState(false)
  const [channelPush, setChannelPush] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'>('WEEKLY')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch reminders for this lead
  const { data: remindersResponse } = useQuery({
    queryKey: ['reminders', leadId],
    queryFn: () => remindersApi.getReminders({ leadId, status: 'PENDING' }),
  })

  const reminders: FollowUpReminder[] = remindersResponse?.data?.reminders || []
  const firedReminders = reminders.filter(r => r.status === 'FIRED' || isOverdue(r.dueAt))

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateReminderData) => remindersApi.createReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', leadId] })
      toast.success('Reminder created')
      resetForm()
    },
    onError: () => toast.error('Failed to create reminder'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersApi.completeReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', leadId] })
      toast.success('Reminder completed')
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      remindersApi.snoozeReminder(id, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', leadId] })
      toast.success('Reminder snoozed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersApi.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', leadId] })
      toast.success('Reminder cancelled')
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setTitle(`Follow up with ${leadName}`)
    setNote('')
    setDueAt('')
    setPriority('MEDIUM')
    setChannelInApp(true)
    setChannelEmail(false)
    setChannelSms(false)
    setChannelPush(false)
    setIsRecurring(false)
    setRecurrencePattern('WEEKLY')
    setRecurrenceInterval(1)
    setRecurrenceEndDate('')
    setRecurrenceCount('')
  }

  const handleQuickCreate = (minutes: number) => {
    let due: Date
    if (minutes === -1) {
      due = getTomorrow9AM()
    } else {
      due = new Date(Date.now() + minutes * 60 * 1000)
    }

    createMutation.mutate({
      leadId,
      title: `Follow up with ${leadName}`,
      dueAt: due.toISOString(),
      priority: 'MEDIUM',
      channelInApp: true,
      channelPush: channelPush,
    })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !dueAt) {
      toast.error('Title and due date are required')
      return
    }

    // If push is enabled, ensure we have a push subscription
    if (channelPush) {
      const subscribed = await isPushSubscribed()
      if (!subscribed) {
        const registered = await registerPush()
        if (!registered) {
          toast.warning('Push notifications could not be enabled. Reminder will use other channels.')
          setChannelPush(false)
        }
      }
    }

    createMutation.mutate({
      leadId,
      title: title.trim(),
      note: note.trim() || undefined,
      dueAt: new Date(dueAt).toISOString(),
      priority,
      channelInApp,
      channelEmail,
      channelSms,
      channelPush,
      ...(isRecurring ? {
        isRecurring: true,
        recurrencePattern: recurrencePattern,
        ...(recurrencePattern === 'CUSTOM' ? { recurrenceInterval } : {}),
        ...(recurrenceEndDate ? { recurrenceEndDate: new Date(recurrenceEndDate).toISOString() } : {}),
        ...(recurrenceCount ? { recurrenceCount: parseInt(recurrenceCount) } : {}),
      } : {}),
    })
  }

  const handleSnooze = (id: string, minutes: number) => {
    const until = minutes === -1
      ? getTomorrow9AM().toISOString()
      : new Date(Date.now() + minutes * 60 * 1000).toISOString()
    snoozeMutation.mutate({ id, until })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Follow-Up Reminders</CardTitle>
            {firedReminders.length > 0 && (
              <Badge variant="destructive" className="text-xs h-5 px-1.5">
                {firedReminders.length} due
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* Quick reminder buttons */}
          {!showForm && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5">Quick reminder:</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_TIMES.map(qt => (
                  <Button
                    key={qt.label}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    onClick={() => handleQuickCreate(qt.minutes)}
                    disabled={createMutation.isPending}
                  >
                    <Timer className="h-3 w-3 mr-1" />
                    {qt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom reminder form */}
          {showForm && (
            <div className="space-y-3 mb-3 p-3 rounded-lg border bg-muted/30">
              <div>
                <label className="text-xs font-medium">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background transition-colors"
                  placeholder="Follow up about..."
                />
              </div>

              <div>
                <label className="text-xs font-medium">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm bg-background resize-none transition-colors"
                  rows={2}
                  placeholder="Additional context..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={e => setDueAt(e.target.value)}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm bg-background transition-colors"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as typeof priority)}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm bg-background transition-colors"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Delivery channels */}
              <div>
                <label className="text-xs font-medium mb-1.5 block">Notify me via:</label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelInApp}
                      onChange={e => setChannelInApp(e.target.checked)}
                      className="rounded"
                    />
                    <Bell className="h-3 w-3" /> In-App
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelEmail}
                      onChange={e => setChannelEmail(e.target.checked)}
                      className="rounded"
                    />
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelSms}
                      onChange={e => setChannelSms(e.target.checked)}
                      className="rounded"
                    />
                    <MessageSquare className="h-3 w-3" /> SMS
                  </label>
                  {isPushSupported() && (
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelPush}
                        onChange={e => setChannelPush(e.target.checked)}
                        className="rounded"
                      />
                      <Smartphone className="h-3 w-3" /> Push
                    </label>
                  )}
                </div>
              </div>

              {/* Recurrence options */}
              <div>
                <label className="flex items-center gap-2 text-xs cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="rounded"
                  />
                  <RefreshCw className="h-3 w-3" /> Make recurring
                </label>
                {isRecurring && (
                  <div className="space-y-2 pl-5 border-l-2 border-blue-200 dark:border-blue-800">
                    <div>
                      <label className="text-xs text-muted-foreground">Repeat</label>
                      <select
                        value={recurrencePattern}
                        onChange={e => setRecurrencePattern(e.target.value as typeof recurrencePattern)}
                        className="w-full mt-0.5 px-2 py-1 text-xs border rounded dark:bg-card dark:border-border dark:text-white"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Biweekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="CUSTOM">Custom (every N days)</option>
                      </select>
                    </div>
                    {recurrencePattern === 'CUSTOM' && (
                      <div>
                        <label className="text-xs text-muted-foreground">Every N days</label>
                        <input
                          type="number"
                          min={1}
                          value={recurrenceInterval}
                          onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-full mt-0.5 px-2 py-1 text-xs border rounded dark:bg-card dark:border-border dark:text-white"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">End date (optional)</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={e => setRecurrenceEndDate(e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 text-xs border rounded dark:bg-card dark:border-border dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Max count (optional)</label>
                        <input
                          type="number"
                          min={1}
                          value={recurrenceCount}
                          onChange={e => setRecurrenceCount(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full mt-0.5 px-2 py-1 text-xs border rounded dark:bg-card dark:border-border dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !title.trim() || !dueAt}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Set Reminder'}
                </Button>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Active reminders list */}
          <div className="space-y-2">
            {reminders.length === 0 && !showForm && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No active reminders. Set one above.
              </p>
            )}

            {reminders.map(reminder => {
              const overdue = isOverdue(reminder.dueAt)
              return (
                <div
                  key={reminder.id}
                  className={`rounded-lg border p-2.5 text-sm transition-all duration-200 hover:shadow-md ${
                    overdue ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium text-xs truncate">{reminder.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className={overdue ? 'text-red-600 font-medium' : ''}>
                          {formatDueDate(reminder.dueAt)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[reminder.priority]}`}>
                          {reminder.priority}
                        </span>
                      </div>
                      {reminder.note && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reminder.note}</p>
                      )}
                      {/* Channel indicators */}
                      <div className="flex gap-1 mt-1">
                        {reminder.channelInApp && <Bell className="h-3 w-3 text-muted-foreground" />}
                        {reminder.channelEmail && <Mail className="h-3 w-3 text-muted-foreground" />}
                        {reminder.channelSms && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                        {reminder.channelPush && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => completeMutation.mutate(reminder.id)}
                        title="Mark complete"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteMutation.mutate(reminder.id)}
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* Snooze options for overdue/fired */}
                  {(overdue || reminder.status === 'FIRED') && (
                    <div className="mt-2 pt-2 border-t flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground mr-1">Snooze:</span>
                      {[
                        { label: '30m', min: 30 },
                        { label: '1h', min: 60 },
                        { label: '3h', min: 180 },
                        { label: 'Tomorrow', min: -1 },
                      ].map(s => (
                        <Button
                          key={s.label}
                          size="sm"
                          variant="outline"
                          className="h-5 text-[10px] px-1.5"
                          onClick={() => handleSnooze(reminder.id, s.min)}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
