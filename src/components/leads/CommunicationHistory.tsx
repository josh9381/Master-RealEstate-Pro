import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Mail,
  Phone,
  MessageSquare,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import { messagesApi, callsApi } from '@/lib/api'

interface Message {
  id: string
  type: 'EMAIL' | 'SMS' | 'CALL'
  direction: 'INBOUND' | 'OUTBOUND'
  status: string
  outcome?: string
  subject?: string
  body?: string
  to?: string
  from?: string
  phoneNumber?: string
  duration?: number
  notes?: string
  followUpDate?: string
  calledBy?: { id: string; firstName: string; lastName: string }
  createdAt: string
  read?: boolean
  metadata?: Record<string, unknown>
}

interface CommunicationHistoryProps {
  leadId: string
  leadName: string
  leadPhone?: string
  onComposeEmail?: () => void
  onComposeSMS?: () => void
  onLogCall?: () => void
}

const typeFilters = [
  { value: 'ALL', label: 'All', icon: Filter },
  { value: 'EMAIL', label: 'Emails', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: MessageSquare },
  { value: 'CALL', label: 'Calls', icon: Phone },
] as const

function CommunicationHistory({
  leadId,
  leadName,
  leadPhone,
  onComposeEmail,
  onComposeSMS,
  onLogCall,
}: CommunicationHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch messages for this lead
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['lead-messages', leadId, typeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { leadId, limit: 100 }
      if (typeFilter !== 'ALL') {
        params.type = typeFilter
      }
      const response = await messagesApi.getMessages(params)
      return response
    },
    enabled: !!leadId,
  })

  // Fetch communication stats
  const { data: statsData } = useQuery({
    queryKey: ['lead-message-stats', leadId],
    queryFn: async () => {
      const response = await messagesApi.getStats({ leadId })
      return response
    },
    enabled: !!leadId,
  })

  // Fetch call logs from dedicated calls API
  const { data: callsData } = useQuery({
    queryKey: ['lead-calls', leadId, typeFilter],
    queryFn: async () => {
      const response = await callsApi.getCalls({ leadId, limit: 100 })
      return response
    },
    enabled: !!leadId && (typeFilter === 'ALL' || typeFilter === 'CALL'),
  })

  // Extract messages from response
  const rawMessages: Message[] = messagesData?.data?.messages || messagesData?.messages || messagesData?.data || []
  const messageList = Array.isArray(rawMessages) ? rawMessages : []

  // Extract call logs and normalize them into Message format
  const rawCalls = callsData?.data?.calls || []
  const callMessages: Message[] = Array.isArray(rawCalls)
    ? rawCalls.map((call: { id: string; direction: string; status: string; outcome?: string; phoneNumber?: string; duration?: number; notes?: string; followUpDate?: string; calledBy?: { id: string; firstName: string; lastName: string }; createdAt: string }) => ({
        id: `call-${call.id}`,
        type: 'CALL' as const,
        direction: call.direction as 'INBOUND' | 'OUTBOUND',
        status: call.status,
        outcome: call.outcome,
        phoneNumber: call.phoneNumber,
        duration: call.duration,
        notes: call.notes,
        followUpDate: call.followUpDate,
        calledBy: call.calledBy,
        createdAt: call.createdAt,
      }))
    : []

  // Merge and de-duplicate (avoid showing both Message type=CALL and Call records for same event)
  // Call logs from /api/calls take priority  since they have richer data
  const mergedMessages = [...messageList.filter(m => m.type !== 'CALL'), ...callMessages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const messages = mergedMessages

  // Filter by search
  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      msg.subject?.toLowerCase().includes(q) ||
      msg.body?.toLowerCase().includes(q) ||
      msg.to?.toLowerCase().includes(q) ||
      msg.from?.toLowerCase().includes(q)
    )
  })

  const stats = statsData?.data || statsData || {}
  const emailCount = stats.emailCount || stats.emails || 0
  const smsCount = stats.smsCount || stats.sms || 0
  const callLogCount = callsData?.data?.total || callMessages.length
  const callCount = callLogCount || stats.callCount || stats.calls || 0
  const totalCount = emailCount + smsCount + callCount

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />
      case 'SMS':
        return <MessageSquare className="h-4 w-4" />
      case 'CALL':
        return <Phone className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
      case 'SMS':
        return 'text-green-600 bg-green-50 dark:bg-green-950/30'
      case 'CALL':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
      default:
        return 'text-muted-foreground bg-muted dark:bg-gray-950/30'
    }
  }

  const getDirectionIcon = (direction: string) => {
    return direction === 'INBOUND' ? (
      <ArrowDownLeft className="h-3 w-3 text-blue-500" />
    ) : (
      <ArrowUpRight className="h-3 w-3 text-green-500" />
    )
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (statusLower === 'delivered' || statusLower === 'sent' || statusLower === 'completed') {
      return (
        <Badge variant="success" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      )
    }
    if (statusLower === 'failed' || statusLower === 'bounced' || statusLower === 'error') {
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      )
    }
    if (statusLower === 'pending' || statusLower === 'queued' || statusLower === 'ringing') {
      return (
        <Badge variant="warning" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {status || 'Unknown'}
      </Badge>
    )
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-2xl font-bold">{emailCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Emails</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-green-500" />
            <p className="text-2xl font-bold">{smsCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">SMS</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Phone className="h-3.5 w-3.5 text-purple-500" />
            <p className="text-2xl font-bold">{callCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Calls</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 rounded-lg border p-1">
          {typeFilters.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              size="sm"
              variant={typeFilter === value ? 'default' : 'ghost'}
              onClick={() => setTypeFilter(value)}
              className="h-8 text-xs"
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {onComposeEmail && (
          <Button size="sm" variant="outline" onClick={onComposeEmail}>
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Send Email
          </Button>
        )}
        {onComposeSMS && (
          <Button size="sm" variant="outline" onClick={onComposeSMS}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Send SMS
          </Button>
        )}
        {onLogCall && (
          <Button size="sm" variant="outline" onClick={onLogCall}>
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Log Call
          </Button>
        )}
      </div>

      {/* Message List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="text-sm font-medium mb-1">
            {messages.length === 0 ? 'No communications yet' : 'No matching results'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {messages.length === 0
              ? `Start a conversation with ${leadName}`
              : 'Try adjusting your search or filters'}
          </p>
          {messages.length === 0 && onComposeEmail && (
            <Button size="sm" onClick={onComposeEmail}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send First Email
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((msg) => {
            const isExpanded = expandedId === msg.id
            return (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                  !msg.read && msg.direction === 'INBOUND' ? 'border-l-2 border-l-primary' : ''
                }`}
                onClick={() => setExpandedId(isExpanded ? null : msg.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`rounded-full p-2 mt-0.5 ${getTypeColor(msg.type)}`}>
                      {getTypeIcon(msg.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {getDirectionIcon(msg.direction)}
                        <span className="text-sm font-medium truncate">
                          {msg.type === 'EMAIL'
                            ? msg.subject || 'No subject'
                            : msg.type === 'CALL'
                            ? `${msg.direction === 'INBOUND' ? 'Incoming' : 'Outgoing'} Call`
                            : msg.direction === 'INBOUND'
                            ? 'Received SMS'
                            : 'Sent SMS'}
                        </span>
                        {!msg.read && msg.direction === 'INBOUND' && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>

                      {/* Preview text */}
                      <p className="text-xs text-muted-foreground truncate">
                        {msg.type === 'CALL'
                          ? `${msg.phoneNumber || leadPhone || 'Unknown'}${
                              msg.outcome ? ` • ${msg.outcome.replace(/_/g, ' ')}` : ''
                            }${formatDuration(msg.duration) ? ` • ${formatDuration(msg.duration)}` : ''}`
                          : msg.body
                          ? msg.body.replace(/<[^>]*>/g, '').slice(0, 120)
                          : 'No content'}
                      </p>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          {msg.type === 'EMAIL' && msg.body && (
                            <div
                              className="text-sm prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{
                                __html: msg.body,
                              }}
                            />
                          )}
                          {msg.type === 'SMS' && msg.body && (
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          )}
                          {msg.type === 'CALL' && (
                            <div className="text-sm space-y-1.5">
                              <p>
                                <span className="text-muted-foreground">Phone:</span>{' '}
                                {msg.phoneNumber || leadPhone || 'Unknown'}
                              </p>
                              {msg.outcome && (
                                <p>
                                  <span className="text-muted-foreground">Outcome:</span>{' '}
                                  <Badge variant={
                                    msg.outcome === 'ANSWERED' ? 'success' :
                                    msg.outcome === 'DNC_REQUEST' ? 'destructive' :
                                    msg.outcome === 'NOT_INTERESTED' ? 'destructive' :
                                    'secondary'
                                  } className="text-xs ml-1">
                                    {msg.outcome.replace(/_/g, ' ')}
                                  </Badge>
                                </p>
                              )}
                              {msg.duration != null && msg.duration > 0 && (
                                <p>
                                  <span className="text-muted-foreground">Duration:</span>{' '}
                                  {formatDuration(msg.duration)}
                                </p>
                              )}
                              {msg.calledBy && (
                                <p>
                                  <span className="text-muted-foreground">Called by:</span>{' '}
                                  {msg.calledBy.firstName} {msg.calledBy.lastName}
                                </p>
                              )}
                              {msg.notes && (
                                <div className="mt-2 rounded-md bg-muted/50 p-2.5">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                                  <p className="text-sm whitespace-pre-wrap">{msg.notes}</p>
                                </div>
                              )}
                              {msg.followUpDate && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  <Clock className="h-3 w-3" />
                                  Follow-up: {new Date(msg.followUpDate).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: 'numeric', minute: '2-digit',
                                  })}
                                </p>
                              )}
                              <p>
                                <span className="text-muted-foreground">Status:</span>{' '}
                                {msg.status}
                              </p>
                            </div>
                          )}
                          {(msg.to || msg.from) && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {msg.direction === 'OUTBOUND' && msg.to && (
                                <p>To: {msg.to}</p>
                              )}
                              {msg.direction === 'INBOUND' && msg.from && (
                                <p>From: {msg.from}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: status + time */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {getStatusBadge(msg.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(msg.createdAt)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { CommunicationHistory }
