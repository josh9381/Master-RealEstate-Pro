import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Download, Mail, Phone, MessageSquare, Calendar, FileText, UserPlus, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { activitiesApi } from '@/lib/api'
import type { ActivityRecord } from '@/types'

export default function ActivityPage() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch real activities from API
  const { data: activitiesResponse } = useQuery({
    queryKey: ['activities', filter],
    queryFn: () => activitiesApi.getActivities({ limit: 50 }),
  })

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    note: FileText,
    sms: MessageSquare,
    lead: UserPlus,
    status_change: Activity,
  }

  const colorMap: Record<string, string> = {
    email: 'text-blue-500',
    call: 'text-green-500',
    meeting: 'text-purple-500',
    note: 'text-yellow-500',
    sms: 'text-orange-500',
    lead: 'text-indigo-500',
    status_change: 'text-gray-500',
  }

  function getRelativeTime(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  }

  // Map API response to component format
  const activities = useMemo(() => {
    const raw = activitiesResponse?.data?.activities || activitiesResponse?.activities || activitiesResponse || []
    if (!Array.isArray(raw)) return []
    return raw.map((a: ActivityRecord) => ({
      id: a.id || a._id,
      type: a.type || 'note',
      title: a.title || a.description || 'Activity',
      description: a.description || '',
      user: (typeof a.user === 'object' ? a.user?.name : a.user) || a.userName || 'System',
      timestamp: a.createdAt ? getRelativeTime(a.createdAt) : 'Unknown',
      icon: iconMap[a.type] || Activity,
      color: colorMap[a.type] || 'text-gray-500',
    }))
  }, [activitiesResponse])

  const filteredActivities = activities.filter(activity => {
    if (filter !== 'all' && activity.type !== filter) return false
    if (searchTerm && !activity.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !activity.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground">Track all activities across your CRM</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.length}</div>
          <div className="text-sm text-muted-foreground">Total Activities</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a) => a.type === 'EMAIL' || a.type === 'email').length}</div>
          <div className="text-sm text-muted-foreground">Emails Sent</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a) => a.type === 'CALL' || a.type === 'call').length}</div>
          <div className="text-sm text-muted-foreground">Calls Made</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{activities.filter((a) => a.type === 'MEETING' || a.type === 'meeting').length}</div>
          <div className="text-sm text-muted-foreground">Meetings</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('email')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Emails
            </Button>
            <Button
              variant={filter === 'call' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('call')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Calls
            </Button>
            <Button
              variant={filter === 'meeting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('meeting')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Meetings
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
        
        <div className="space-y-6">
          {filteredActivities.map((activity, index) => {
            const Icon = activity.icon
            
            return (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-lg bg-accent ${activity.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold">{activity.title}</h3>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <Badge variant="outline">{activity.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No activities found matching your filters
          </div>
        )}
      </Card>
    </div>
  )
}
