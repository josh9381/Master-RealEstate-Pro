import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  Calendar,
  User,
  Tag,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  MousePointerClick,
  Loader2
} from 'lucide-react'
import { activitiesApi } from '@/lib/api'

interface Activity {
  id: number | string
  type: 'email' | 'call' | 'sms' | 'note' | 'status' | 'meeting' | 'task' | 'status_change'
  title: string
  description: string
  date: string
  timestamp: string
  author?: string
  details?: {
    subject?: string
    duration?: string
    outcome?: string
    emailOpened?: boolean
    emailClicked?: boolean
    attachments?: number
    tags?: string[]
  }
}

interface ActivityTimelineProps {
  leadName?: string
  leadId?: string
}

const mockActivities: Activity[] = []

const activityConfig: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  call: { icon: Phone, color: 'text-green-500', bg: 'bg-green-500/10' },
  sms: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  note: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  status: { icon: CheckCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  status_change: { icon: CheckCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  meeting: { icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  task: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function mapApiActivity(raw: Record<string, unknown>): Activity {
  const type = (raw.type === 'status_change' ? 'status' : raw.type) as Activity['type']
  const createdAt = (raw.createdAt || raw.created_at || raw.date || new Date().toISOString()) as string
  return {
    id: raw.id as string | number,
    type: type || 'note',
    title: (raw.title as string) || `${String(type || 'activity').charAt(0).toUpperCase() + String(type || 'activity').slice(1)} logged`,
    description: (raw.description as string) || '',
    date: formatRelativeDate(createdAt),
    timestamp: formatTime(createdAt),
    author: (raw.userName as string) || (raw.author as string) || undefined,
    details: raw.metadata as Activity['details'] || undefined,
  }
}

export function ActivityTimeline({ leadName = 'this lead', leadId }: ActivityTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'email' | 'call' | 'sms' | 'note'>('all')
  const [expandedIds, setExpandedIds] = useState<(number | string)[]>([])

  // Fetch real activities from API when leadId is provided
  const { data: apiActivities, isLoading } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => activitiesApi.getLeadActivities(leadId!),
    enabled: !!leadId,
  })

  // Map API response to Activity type; show empty state for real leads with no activities
  const activities: Activity[] = (() => {
    if (leadId && apiActivities) {
      const items = Array.isArray(apiActivities) ? apiActivities : apiActivities?.data || apiActivities?.activities || []
      return items.length > 0 ? items.map(mapApiActivity) : []
    }
    // Only show mock data when no leadId is provided (standalone usage)
    return leadId ? [] : mockActivities
  })()

  const filteredActivities = activities.filter(activity => 
    filter === 'all' || activity.type === filter
  )

  const toggleExpanded = (id: number | string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const hasDetails = (activity: Activity) => {
    return activity.details && Object.keys(activity.details).length > 0
  }

  if (isLoading && leadId) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activities...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Activities
        </Button>
        <Button
          size="sm"
          variant={filter === 'email' ? 'default' : 'outline'}
          onClick={() => setFilter('email')}
          className="gap-1"
        >
          <Mail className="h-3 w-3" />
          Emails
        </Button>
        <Button
          size="sm"
          variant={filter === 'call' ? 'default' : 'outline'}
          onClick={() => setFilter('call')}
          className="gap-1"
        >
          <Phone className="h-3 w-3" />
          Calls
        </Button>
        <Button
          size="sm"
          variant={filter === 'sms' ? 'default' : 'outline'}
          onClick={() => setFilter('sms')}
          className="gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          SMS
        </Button>
        <Button
          size="sm"
          variant={filter === 'note' ? 'default' : 'outline'}
          onClick={() => setFilter('note')}
          className="gap-1"
        >
          <FileText className="h-3 w-3" />
          Notes
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative space-y-6">
        {/* Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        {filteredActivities.map((activity, index) => {
              const config = activityConfig[activity.type] || activityConfig.note
              const Icon = config.icon
          const isExpanded = expandedIds.includes(activity.id)
          const showExpandButton = hasDetails(activity)

          return (
            <div key={activity.id} className="relative">
              {/* Date Separator */}
              {(index === 0 || filteredActivities[index - 1].date !== activity.date) && (
                <div className="mb-4 flex items-center gap-2">
                  <div className="text-sm font-semibold text-muted-foreground">{activity.date}</div>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{activity.title}</p>
                        
                        {/* Email Tracking Badges */}
                        {activity.type === 'email' && activity.details?.emailOpened && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            Opened
                          </Badge>
                        )}
                        {activity.type === 'email' && activity.details?.emailClicked && (
                          <Badge variant="default" className="text-xs gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            Clicked
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.timestamp}</span>
                      {showExpandButton && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpanded(activity.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Author */}
                  {activity.author && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{activity.author}</span>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && activity.details && (
                    <div className="mt-3 rounded-lg border bg-muted/50 p-3 space-y-2">
                      {activity.details.subject && (
                        <div className="flex items-start gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Subject</p>
                            <p className="text-sm">{activity.details.subject}</p>
                          </div>
                        </div>
                      )}
                      
                      {activity.details.duration && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{activity.details.duration}</span>
                        </div>
                      )}
                      
                      {activity.details.outcome && (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Outcome</p>
                            <p className="text-sm">{activity.details.outcome}</p>
                          </div>
                        </div>
                      )}
                      
                      {activity.details.attachments && activity.details.attachments > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Attachments:</span>
                          <span className="font-medium">{activity.details.attachments} files</span>
                        </div>
                      )}
                      
                      {activity.details.tags && activity.details.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {activity.details.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No {filter !== 'all' && `${filter} `}activities found for {leadName}
        </div>
      )}
    </div>
  )
}
