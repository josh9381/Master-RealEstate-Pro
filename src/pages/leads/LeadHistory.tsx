import { History, Clock, User, Tag, FileText, Calendar, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { activitiesApi } from '@/lib/api';
import { LeadsSubNav } from '@/components/leads/LeadsSubNav';

const LeadHistory = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [timeline, setTimeline] = useState<any[]>([]);
  const [allTimeline, setAllTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    statusChanges: 0,
    emails: 0,
    notes: 0,
    tasks: 0,
    calls: 0
  });

  useEffect(() => {
    loadActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const response = await activitiesApi.getActivities({ limit: 50 });
      const activities = response.data?.activities || [];
      
      // Transform activities to timeline format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timelineItems = activities.map((activity: any, index: number) => ({
        id: activity.id || index,
        type: activity.type || 'activity',
        title: formatTitle(activity.type),
        description: activity.description || 'No description',
        user: activity.user 
          ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || 'System'
          : 'System',
        timestamp: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown',
        icon: getIconForType(activity.type),
        color: getColorForType(activity.type),
      }));

      setTimeline(timelineItems);
      setAllTimeline(timelineItems);

      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newStats = {
        total: activities.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        statusChanges: activities.filter((a: any) => a.type === 'status_change').length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emails: activities.filter((a: any) => a.type === 'email').length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notes: activities.filter((a: any) => a.type === 'note').length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasks: activities.filter((a: any) => a.type === 'task').length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calls: activities.filter((a: any) => a.type === 'call').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTitle = (type: string): string => {
    const titles: { [key: string]: string } = {
      'status_change': 'Status Changed',
      'email': 'Email Sent',
      'note': 'Note Added',
      'call': 'Phone Call',
      'meeting': 'Meeting Scheduled',
      'task': 'Task Updated',
    };
    return titles[type] || 'Activity';
  };

  const getIconForType = (type: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icons: { [key: string]: any } = {
      'status_change': Tag,
      'email': FileText,
      'note': FileText,
      'call': Clock,
      'meeting': Calendar,
      'task': Calendar,
    };
    return icons[type] || History;
  };

  const getColorForType = (type: string): string => {
    const colors: { [key: string]: string } = {
      'status_change': 'blue',
      'email': 'green',
      'note': 'purple',
      'call': 'orange',
      'meeting': 'blue',
      'task': 'orange',
    };
    return colors[type] || 'gray';
  };

  const handleFilterChange = (filterType: string) => {
    setActiveFilter(filterType);
    if (filterType === 'all') {
      setTimeline(allTimeline);
    } else {
      setTimeline(allTimeline.filter(item => item.type === filterType));
    }
  };

  const displayStats = [
    { label: 'Total Activities', value: stats.total.toString() },
    { label: 'Status Changes', value: stats.statusChanges.toString() },
    { label: 'Emails Sent', value: stats.emails.toString() },
    { label: 'Notes Added', value: stats.notes.toString() },
    { label: 'Tasks Completed', value: stats.tasks.toString() },
    { label: 'Phone Calls', value: stats.calls.toString() },
  ];

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Activity History</h1>
          <p className="text-muted-foreground mt-2">
            Complete timeline of all lead interactions and changes
          </p>
        </div>
        <Button onClick={loadActivities} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Lead Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Overview</CardTitle>
          <CardDescription>Summary of lead activities across all leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {displayStats.map((stat) => (
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
            <Badge 
              variant={activeFilter === 'all' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('all')}
            >
              All Activities ({stats.total})
            </Badge>
            <Badge 
              variant={activeFilter === 'status_change' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('status_change')}
            >
              Status Changes ({stats.statusChanges})
            </Badge>
            <Badge 
              variant={activeFilter === 'email' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('email')}
            >
              Emails ({stats.emails})
            </Badge>
            <Badge 
              variant={activeFilter === 'note' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('note')}
            >
              Notes ({stats.notes})
            </Badge>
            <Badge 
              variant={activeFilter === 'task' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('task')}
            >
              Tasks ({stats.tasks})
            </Badge>
            <Badge 
              variant={activeFilter === 'call' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleFilterChange('call')}
            >
              Calls ({stats.calls})
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadHistory;
