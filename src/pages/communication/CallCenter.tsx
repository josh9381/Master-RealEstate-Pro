import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatRate } from '@/lib/metricsCalculator'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  PhoneMissed,
  RefreshCw,
  User,
  MapPin,
  DollarSign,
  Calendar,
  ChevronRight,
  ThumbsDown,
  PhoneOff,
  AlertTriangle,
  Star,
  Timer,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  PhoneForwarded,
  Ban,
  Building,
  Mail,
  Target,
} from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast'
import { callsApi } from '@/lib/api'

interface QueueLead {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: string
  score: number
  source: string | null
  company: string | null
  lastContactAt: string | null
  createdAt: string
  propertyType: string | null
  transactionType: string | null
  budgetMin: number | null
  budgetMax: number | null
  lastCallAt: string | null
  lastCallOutcome: string | null
  hasCallback: boolean
  priority: number
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Hot'
  if (score >= 60) return 'Warm'
  if (score >= 40) return 'Cool'
  return 'Cold'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const CallCenter = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<QueueLead | null>(null)
  const [callNotes, setCallNotes] = useState('')
  const [callStartTime, setCallStartTime] = useState<number | null>(() => {
    const stored = sessionStorage.getItem('callCenter_startTime')
    return stored ? Number(stored) : null
  })
  const [callElapsed, setCallElapsed] = useState(0)
  const [callActive, setCallActive] = useState(() => sessionStorage.getItem('callCenter_active') === 'true')

  // Restore selected lead from session on mount
  useEffect(() => {
    const storedLeadId = sessionStorage.getItem('callCenter_leadId')
    if (storedLeadId && !selectedLead) {
      const lead = queue.find(l => l.id === storedLeadId)
      if (lead) setSelectedLead(lead)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live call timer
  useEffect(() => {
    if (!callActive || !callStartTime) {
      setCallElapsed(0)
      return
    }
    const tick = () => setCallElapsed(Math.round((Date.now() - callStartTime) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [callActive, callStartTime])

  const formatTimer = useCallback((secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  // Smart call queue
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['call-queue'],
    queryFn: async () => {
      const res = await callsApi.getQueue({ limit: 25 })
      return res.data as { queue: QueueLead[]; total: number }
    },
  })

  // Today's stats
  const { data: todayStats } = useQuery({
    queryKey: ['call-today-stats'],
    queryFn: async () => {
      const res = await callsApi.getTodayStats()
      return res.data as {
        totalCalls: number
        answered: number
        connectionRate: number
        totalTalkTimeSeconds: number
        avgDurationSeconds: number
        byOutcome: Record<string, number>
      }
    },
    refetchInterval: 30000, // refresh every 30s
  })

  // Recent calls
  const { data: recentData } = useQuery({
    queryKey: ['call-recent'],
    queryFn: async () => {
      const res = await callsApi.getCalls({ limit: 10 })
      return res.data
    },
  })
  const recentCalls = recentData?.calls || []

  // Log call mutation
  const logCallMutation = useMutation({
    mutationFn: (data: { leadId: string; phoneNumber: string; direction: 'OUTBOUND'; outcome: string; duration?: number; notes?: string }) =>
      callsApi.logCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-queue'] })
      queryClient.invalidateQueries({ queryKey: ['call-today-stats'] })
      queryClient.invalidateQueries({ queryKey: ['call-recent'] })
      toast.success('Call logged successfully')
      setCallNotes('')
      setCallStartTime(null)
    },
    onError: () => toast.error('Failed to log call'),
  })

  const queue = queueData?.queue || []

  const handleSelectLead = (lead: QueueLead) => {
    setSelectedLead(lead)
    setCallNotes('')
    setCallStartTime(null)
    handleEndCall()
  }

  const handleStartCall = () => {
    if (!selectedLead?.phone) return
    const now = Date.now()
    setCallStartTime(now)
    setCallActive(true)
    sessionStorage.setItem('callCenter_startTime', String(now))
    sessionStorage.setItem('callCenter_active', 'true')
    sessionStorage.setItem('callCenter_leadId', selectedLead.id)
  }

  const handleEndCall = useCallback(() => {
    setCallActive(false)
    sessionStorage.removeItem('callCenter_startTime')
    sessionStorage.removeItem('callCenter_active')
    sessionStorage.removeItem('callCenter_leadId')
  }, [])

  const handleDisposition = (outcome: string) => {
    if (!selectedLead) return
    const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : undefined
    handleEndCall()
    logCallMutation.mutate({
      leadId: selectedLead.id,
      phoneNumber: selectedLead.phone || '',
      direction: 'OUTBOUND',
      outcome,
      duration,
      notes: callNotes || undefined,
    })
    // Move to next lead in queue
    const idx = queue.findIndex(l => l.id === selectedLead.id)
    const next = queue[idx + 1] || null
    setSelectedLead(next)
  }

  const handleNextLead = () => {
    if (!selectedLead) {
      if (queue.length > 0) setSelectedLead(queue[0])
      return
    }
    const idx = queue.findIndex(l => l.id === selectedLead.id)
    const next = queue[idx + 1] || null
    if (next) {
      handleSelectLead(next)
    } else {
      toast.info('End of queue')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cold Call Hub</h1>
          <p className="text-muted-foreground mt-1">Smart queue + lead context + quick disposition</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['call-queue'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Queue
          </Button>
          {!selectedLead && queue.length > 0 && (
            <Button onClick={() => handleSelectLead(queue[0])}>
              <Phone className="h-4 w-4 mr-2" />
              Start Calling
            </Button>
          )}
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.totalCalls || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.answered || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRate(todayStats?.connectionRate || 0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talk Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(todayStats?.totalTalkTimeSeconds || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.avgDurationSeconds ? `${Math.round(todayStats.avgDurationSeconds / 60)}m` : '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Queue + Lead Context */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Call Queue */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Call Queue</CardTitle>
                <Badge variant="secondary">{queueData?.total || 0} leads</Badge>
              </div>
              <CardDescription>Prioritized by score, callbacks, and recency</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {queueLoading ? (
                <div className="p-4"><LoadingSkeleton rows={5} /></div>
              ) : queue.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No leads in queue</p>
                  <p className="text-xs mt-1">All leads contacted recently or no phone numbers</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto divide-y">
                  {queue.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${selectedLead?.id === lead.id ? 'bg-accent border-l-4 border-l-primary' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {lead.hasCallback && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Callback</Badge>
                          )}
                          <span className={`text-xs font-semibold ${getScoreColor(lead.score)}`}>
                            {lead.score}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.company && <span className="truncate">{lead.company}</span>}
                        {lead.source && <Badge variant="outline" className="text-[10px] px-1 py-0">{lead.source}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last contact: {timeAgo(lead.lastContactAt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Context Panel + Disposition */}
        <div className="lg:col-span-2 space-y-4">
          {selectedLead ? (
            <>
              {/* Lead Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {selectedLead.firstName} {selectedLead.lastName}
                        <Badge variant="outline" className={getScoreColor(selectedLead.score)}>
                          <Star className="h-3 w-3 mr-1" />
                          {selectedLead.score} — {getScoreLabel(selectedLead.score)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {selectedLead.status.replace(/_/g, ' ')}
                        {selectedLead.hasCallback && (
                          <Badge variant="destructive" className="ml-2 text-xs">Scheduled Callback</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/leads/${selectedLead.id}`)}>
                        <User className="h-4 w-4 mr-1" />
                        Full Profile
                      </Button>
                      {callActive ? (
                        <Button size="sm" variant="destructive" onClick={handleEndCall}>
                          <PhoneOff className="h-4 w-4 mr-1" />
                          End Call {formatTimer(callElapsed)}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleStartCall} disabled={!selectedLead.phone}>
                          <Phone className="h-4 w-4 mr-1" />
                          Call {selectedLead.phone || 'No phone'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {selectedLead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLead.phone}</span>
                      </div>
                    )}
                    {selectedLead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{selectedLead.email}</span>
                      </div>
                    )}
                    {selectedLead.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLead.company}</span>
                      </div>
                    )}
                    {selectedLead.source && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>Source: {selectedLead.source}</span>
                      </div>
                    )}
                    {selectedLead.propertyType && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLead.propertyType} — {selectedLead.transactionType || 'Unknown'}</span>
                      </div>
                    )}
                    {(selectedLead.budgetMin || selectedLead.budgetMax) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedLead.budgetMin ? `$${(selectedLead.budgetMin / 1000).toFixed(0)}k` : '?'}
                          {' — '}
                          {selectedLead.budgetMax ? `$${(selectedLead.budgetMax / 1000).toFixed(0)}k` : '?'}
                        </span>
                      </div>
                    )}
                    {selectedLead.lastCallOutcome && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Last call: {formatOutcome(selectedLead.lastCallOutcome)} ({timeAgo(selectedLead.lastCallAt)})</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Call Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Call Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px] bg-background"
                    placeholder="Type notes during the call..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Quick Disposition Buttons */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Disposition</CardTitle>
                  <CardDescription>Select the outcome — lead is automatically updated and the next lead loads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-green-200 hover:bg-green-50 hover:border-green-400 text-green-700"
                      onClick={() => handleDisposition('ANSWERED')}
                      disabled={logCallMutation.isPending}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-xs font-medium">Answered</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-700"
                      onClick={() => handleDisposition('CALLBACK_SCHEDULED')}
                      disabled={logCallMutation.isPending}
                    >
                      <PhoneForwarded className="h-5 w-5" />
                      <span className="text-xs font-medium">Callback</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-border text-muted-foreground cursor-not-allowed opacity-60"
                      disabled={true}
                      title="Coming Soon — Voicemail requires Twilio Voice integration"
                    >
                      <PhoneMissed className="h-5 w-5" />
                      <span className="text-xs font-medium">Voicemail</span>
                      <span className="text-[9px] text-muted-foreground">Coming Soon</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-border hover:bg-muted/50 hover:border-gray-400 text-muted-foreground"
                      onClick={() => handleDisposition('NO_ANSWER')}
                      disabled={logCallMutation.isPending}
                    >
                      <PhoneOff className="h-5 w-5" />
                      <span className="text-xs font-medium">No Answer</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-orange-200 hover:bg-orange-50 hover:border-orange-400 text-orange-600"
                      onClick={() => handleDisposition('NOT_INTERESTED')}
                      disabled={logCallMutation.isPending}
                    >
                      <ThumbsDown className="h-5 w-5" />
                      <span className="text-xs font-medium">Not Interested</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-red-200 hover:bg-red-50 hover:border-red-400 text-red-600"
                      onClick={() => handleDisposition('WRONG_NUMBER')}
                      disabled={logCallMutation.isPending}
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="text-xs font-medium">Wrong Number</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-purple-200 hover:bg-purple-50 hover:border-purple-400 text-purple-700"
                      onClick={() => handleDisposition('LEFT_MESSAGE')}
                      disabled={logCallMutation.isPending}
                    >
                      <PhoneOutgoing className="h-5 w-5" />
                      <span className="text-xs font-medium">Left Message</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-border hover:bg-muted/50 hover:border-gray-400 text-muted-foreground"
                      onClick={() => handleDisposition('BUSY')}
                      disabled={logCallMutation.isPending}
                    >
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-xs font-medium">Busy</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1 border-red-300 hover:bg-red-50 hover:border-red-500 text-red-700"
                      onClick={() => handleDisposition('DNC_REQUEST')}
                      disabled={logCallMutation.isPending}
                    >
                      <Ban className="h-5 w-5" />
                      <span className="text-xs font-medium">Do Not Call</span>
                    </Button>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={handleNextLead}>
                      Skip — Next Lead <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Select a lead to start calling</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Pick a lead from the queue on the left, or click "Start Calling" to begin with the top priority lead.
                </p>
                {queue.length > 0 && (
                  <Button onClick={() => handleSelectLead(queue[0])}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start with Top Lead
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Call History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Your latest call activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No calls logged yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call: any) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${call.direction === 'INBOUND' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {call.direction === 'INBOUND' ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {call.lead?.firstName} {call.lead?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{call.phoneNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {call.outcome && (
                      <Badge variant={call.outcome === 'ANSWERED' ? 'success' : call.outcome === 'DNC_REQUEST' ? 'destructive' : 'secondary'} className="text-xs">
                        {formatOutcome(call.outcome)}
                      </Badge>
                    )}
                    {call.duration && (
                      <span className="text-muted-foreground text-xs">{formatDuration(call.duration)}</span>
                    )}
                    <span className="text-muted-foreground text-xs">{timeAgo(call.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenter;
