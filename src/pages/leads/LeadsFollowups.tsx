import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Calendar, 
  Phone, 
  Mail, 
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  Filter
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface FollowUp {
  id: number
  lead: string
  company: string
  type: 'call' | 'email' | 'meeting' | 'task'
  date: string
  time: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
}

const mockFollowups: FollowUp[] = [
  { 
    id: 1, 
    lead: 'John Doe', 
    company: 'Acme Inc', 
    type: 'call', 
    date: '2025-10-19', 
    time: '2:00 PM', 
    priority: 'high',
    status: 'overdue',
    notes: 'Discuss Q4 pricing and implementation timeline'
  },
  { 
    id: 2, 
    lead: 'Jane Smith', 
    company: 'Tech Corp', 
    type: 'email', 
    date: '2025-10-20', 
    time: '10:00 AM', 
    priority: 'high',
    status: 'pending',
    notes: 'Send updated proposal with revised scope'
  },
  { 
    id: 3, 
    lead: 'Bob Johnson', 
    company: 'StartupXYZ', 
    type: 'meeting', 
    date: '2025-10-20', 
    time: '3:30 PM', 
    priority: 'medium',
    status: 'pending',
    notes: 'Product demo with technical team'
  },
  { 
    id: 4, 
    lead: 'Alice Brown', 
    company: 'BigCo', 
    type: 'email', 
    date: '2025-10-21', 
    time: '9:00 AM', 
    priority: 'low',
    status: 'pending',
    notes: 'Check-in email about decision timeline'
  },
  { 
    id: 5, 
    lead: 'Charlie Wilson', 
    company: 'Enterprise LLC', 
    type: 'call', 
    date: '2025-10-22', 
    time: '11:00 AM', 
    priority: 'medium',
    status: 'pending'
  },
  { 
    id: 6, 
    lead: 'Diana Prince', 
    company: 'Global Systems', 
    type: 'task', 
    date: '2025-10-23', 
    time: '2:00 PM', 
    priority: 'high',
    status: 'pending',
    notes: 'Prepare custom ROI analysis'
  },
]

function LeadsFollowups() {
  const [view, setView] = useState<'queue' | 'calendar'>('queue')
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all')
  const [followups, setFollowups] = useState<FollowUp[]>(mockFollowups)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500' }
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500' }
      default:
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone
      case 'email': return Mail
      case 'meeting': return Calendar
      default: return CheckCircle
    }
  }

  const handleComplete = (id: number) => {
    setFollowups((prev: FollowUp[]) => 
      prev.map((f: FollowUp) => f.id === id ? { ...f, status: 'completed' } : f)
    )
    const followup = followups.find((f: FollowUp) => f.id === id)
    toast.success(`Follow-up with ${followup?.lead} marked as complete`)
  }

  const filteredFollowups = followups.filter((f: FollowUp) => {
    const matchesSearch = f.lead.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         f.company.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    const today = '2025-10-20'
    const weekEnd = '2025-10-27'
    
    switch (filter) {
      case 'overdue':
        return f.status === 'overdue'
      case 'today':
        return f.date === today
      case 'week':
        return f.date >= today && f.date <= weekEnd
      default:
        return true
    }
  })

  const overdueCount = followups.filter((f: FollowUp) => f.status === 'overdue').length
  const todayCount = followups.filter((f: FollowUp) => f.date === '2025-10-20').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your scheduled follow-up tasks and never miss an opportunity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView(view === 'queue' ? 'calendar' : 'queue')}>
            {view === 'queue' ? (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Calendar View
              </>
            ) : (
              <>
                <List className="mr-2 h-4 w-4" />
                Queue View
              </>
            )}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Tasks
        </Button>
        <Button
          size="sm"
          variant={filter === 'overdue' ? 'default' : 'outline'}
          onClick={() => setFilter('overdue')}
          className="gap-2"
        >
          <AlertCircle className="h-3 w-3" />
          Overdue
          {overdueCount > 0 && (
            <Badge variant="secondary" className="ml-1">{overdueCount}</Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant={filter === 'today' ? 'default' : 'outline'}
          onClick={() => setFilter('today')}
          className="gap-2"
        >
          <Clock className="h-3 w-3" />
          Today
          {todayCount > 0 && (
            <Badge variant="secondary" className="ml-1">{todayCount}</Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant={filter === 'week' ? 'default' : 'outline'}
          onClick={() => setFilter('week')}
        >
          This Week
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Follow-ups List */}
      <div className="grid gap-4">
        {filteredFollowups.map((followup) => {
          const statusConfig = getStatusConfig(followup.status)
          const StatusIcon = statusConfig.icon
          const TypeIcon = getTypeIcon(followup.type)

          return (
            <Card 
              key={followup.id}
              className={`transition-all hover:shadow-md ${
                followup.status === 'overdue' ? 'border-red-500/50' : ''
              } ${
                followup.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Type Icon */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${statusConfig.bg}`}>
                      <TypeIcon className={`h-6 w-6 ${statusConfig.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{followup.lead}</p>
                        <span className="text-sm text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{followup.company}</p>
                        <Badge variant={getPriorityColor(followup.priority)} className="text-xs">
                          {followup.priority}
                        </Badge>
                      </div>

                      {followup.notes && (
                        <p className="text-sm text-muted-foreground">{followup.notes}</p>
                      )}

                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(followup.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{followup.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                          <span className={statusConfig.color}>{followup.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {followup.status !== 'completed' && (
                      <Button 
                        size="sm"
                        onClick={() => handleComplete(followup.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      View Lead
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredFollowups.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No follow-ups found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter !== 'all' 
                ? `No ${filter} follow-ups at the moment` 
                : 'Get started by scheduling your first follow-up'
              }
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Follow-up
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default LeadsFollowups
