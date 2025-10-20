import { useState } from 'react'
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
  MousePointerClick
} from 'lucide-react'

interface Activity {
  id: number
  type: 'email' | 'call' | 'sms' | 'note' | 'status' | 'meeting' | 'task'
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
}

const mockActivities: Activity[] = [
  {
    id: 1,
    type: 'email',
    title: 'Email sent: Q4 Proposal Follow-up',
    description: 'Sent proposal follow-up with pricing details',
    date: 'Today',
    timestamp: '10:30 AM',
    author: 'You',
    details: {
      subject: 'Q4 Proposal - Special Pricing Inside',
      emailOpened: true,
      emailClicked: true,
      attachments: 2
    }
  },
  {
    id: 2,
    type: 'call',
    title: 'Phone call completed',
    description: 'Discussed implementation timeline and team requirements',
    date: 'Today',
    timestamp: '9:15 AM',
    author: 'Sarah Johnson',
    details: {
      duration: '23 min',
      outcome: 'Positive - Moving to proposal stage'
    }
  },
  {
    id: 3,
    type: 'sms',
    title: 'SMS sent',
    description: 'Reminder about scheduled demo tomorrow',
    date: 'Yesterday',
    timestamp: '4:45 PM',
    author: 'You',
  },
  {
    id: 4,
    type: 'meeting',
    title: 'Demo meeting scheduled',
    description: 'Product demo with decision makers',
    date: 'Yesterday',
    timestamp: '2:30 PM',
    author: 'Mike Chen',
    details: {
      duration: '45 min',
      tags: ['Demo', 'Enterprise']
    }
  },
  {
    id: 5,
    type: 'note',
    title: 'Note added',
    description: 'Very interested in enterprise features. Budget approved for Q4.',
    date: '2 days ago',
    timestamp: '11:15 AM',
    author: 'Sarah Johnson',
  },
  {
    id: 6,
    type: 'status',
    title: 'Status changed',
    description: 'Changed from "Contacted" to "Qualified"',
    date: '3 days ago',
    timestamp: '9:00 AM',
    author: 'System',
  },
  {
    id: 7,
    type: 'email',
    title: 'Email received: Re: Initial Inquiry',
    description: 'Client expressed interest in enterprise plan',
    date: '4 days ago',
    timestamp: '3:20 PM',
    author: 'John Doe',
    details: {
      subject: 'Re: Initial Inquiry - Enterprise Plan',
      emailOpened: false,
      emailClicked: false,
    }
  },
]

const activityConfig = {
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  call: { icon: Phone, color: 'text-green-500', bg: 'bg-green-500/10' },
  sms: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  note: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  status: { icon: CheckCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  meeting: { icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  task: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
}

export function ActivityTimeline({ leadName = 'this lead' }: ActivityTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'email' | 'call' | 'sms' | 'note'>('all')
  const [expandedIds, setExpandedIds] = useState<number[]>([])

  const filteredActivities = mockActivities.filter(activity => 
    filter === 'all' || activity.type === filter
  )

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const hasDetails = (activity: Activity) => {
    return activity.details && Object.keys(activity.details).length > 0
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
          const config = activityConfig[activity.type]
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
