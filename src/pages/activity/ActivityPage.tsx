import { useState } from 'react'
import { Filter, Download, Mail, Phone, MessageSquare, Calendar, FileText, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export default function ActivityPage() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const activities = [
    {
      id: 1,
      type: 'email',
      title: 'Sent email to John Doe',
      description: 'Follow-up regarding property inquiry',
      user: 'Sarah Johnson',
      timestamp: '2 hours ago',
      icon: Mail,
      color: 'text-blue-500'
    },
    {
      id: 2,
      type: 'call',
      title: 'Phone call with Mike Davis',
      description: 'Discussed contract terms - 15 minutes',
      user: 'John Smith',
      timestamp: '3 hours ago',
      icon: Phone,
      color: 'text-green-500'
    },
    {
      id: 3,
      type: 'meeting',
      title: 'Meeting scheduled',
      description: 'Property viewing with Emily Brown',
      user: 'Sarah Johnson',
      timestamp: '5 hours ago',
      icon: Calendar,
      color: 'text-purple-500'
    },
    {
      id: 4,
      type: 'note',
      title: 'Added note',
      description: 'Client is interested in downtown properties',
      user: 'Mike Davis',
      timestamp: '1 day ago',
      icon: FileText,
      color: 'text-yellow-500'
    },
    {
      id: 5,
      type: 'sms',
      title: 'SMS sent',
      description: 'Reminder about upcoming appointment',
      user: 'Emily Brown',
      timestamp: '1 day ago',
      icon: MessageSquare,
      color: 'text-orange-500'
    },
    {
      id: 6,
      type: 'lead',
      title: 'New lead created',
      description: 'John Anderson - Commercial Real Estate',
      user: 'System',
      timestamp: '2 days ago',
      icon: UserPlus,
      color: 'text-indigo-500'
    },
  ]

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
          <div className="text-2xl font-bold">142</div>
          <div className="text-sm text-muted-foreground">Today's Activities</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">48</div>
          <div className="text-sm text-muted-foreground">Emails Sent</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">23</div>
          <div className="text-sm text-muted-foreground">Calls Made</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">15</div>
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
