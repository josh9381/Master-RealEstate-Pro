import { History, Clock, User, Tag, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const LeadHistory = () => {
  const timeline = [
    {
      id: 1,
      type: 'status_change',
      title: 'Status Changed',
      description: 'New Lead → Qualified',
      user: 'John Doe',
      timestamp: '2024-01-15 14:30',
      icon: Tag,
      color: 'blue',
    },
    {
      id: 2,
      type: 'email_sent',
      title: 'Email Sent',
      description: 'Welcome email campaign delivered',
      user: 'System',
      timestamp: '2024-01-15 10:15',
      icon: FileText,
      color: 'green',
    },
    {
      id: 3,
      type: 'note_added',
      title: 'Note Added',
      description: 'Had a great conversation about their needs. Very interested in our product.',
      user: 'Sarah Johnson',
      timestamp: '2024-01-14 16:45',
      icon: FileText,
      color: 'purple',
    },
    {
      id: 4,
      type: 'task_completed',
      title: 'Task Completed',
      description: 'Follow-up call scheduled for next week',
      user: 'Mike Wilson',
      timestamp: '2024-01-14 11:20',
      icon: Calendar,
      color: 'orange',
    },
    {
      id: 5,
      type: 'email_opened',
      title: 'Email Opened',
      description: 'Opened "Product Introduction" email',
      user: 'System',
      timestamp: '2024-01-13 09:30',
      icon: FileText,
      color: 'green',
    },
    {
      id: 6,
      type: 'assigned',
      title: 'Lead Assigned',
      description: 'Assigned to Sarah Johnson',
      user: 'John Doe',
      timestamp: '2024-01-12 15:00',
      icon: User,
      color: 'blue',
    },
    {
      id: 7,
      type: 'created',
      title: 'Lead Created',
      description: 'Lead captured from website contact form',
      user: 'System',
      timestamp: '2024-01-12 14:30',
      icon: Clock,
      color: 'gray',
    },
  ];

  const stats = [
    { label: 'Total Activities', value: '47' },
    { label: 'Status Changes', value: '8' },
    { label: 'Emails Sent', value: '12' },
    { label: 'Notes Added', value: '15' },
    { label: 'Tasks Completed', value: '9' },
    { label: 'Days Active', value: '23' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Activity History</h1>
        <p className="text-muted-foreground mt-2">
          Complete timeline of all lead interactions and changes
        </p>
      </div>

      {/* Lead Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>John Smith - Acme Corp</CardTitle>
              <CardDescription>john.smith@acmecorp.com • +1 (555) 123-4567</CardDescription>
            </div>
            <Badge variant="success">Qualified</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Chronological history of all lead activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

            <div className="space-y-6">
              {timeline.map((event) => {
                const IconComponent = event.icon;
                return (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center h-12 w-12 rounded-full border-4 border-background ${
                        event.color === 'blue'
                          ? 'bg-blue-500'
                          : event.color === 'green'
                          ? 'bg-green-500'
                          : event.color === 'purple'
                          ? 'bg-purple-500'
                          : event.color === 'orange'
                          ? 'bg-orange-500'
                          : 'bg-gray-500'
                      }`}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{event.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {event.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-3">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{event.user}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Activities</CardTitle>
          <CardDescription>Show specific types of activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="cursor-pointer">
              All Activities (47)
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              Status Changes (8)
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              Emails (12)
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              Notes (15)
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              Tasks (9)
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              Calls (3)
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadHistory;
