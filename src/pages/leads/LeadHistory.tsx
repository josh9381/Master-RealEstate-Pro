import { History, Clock, User, Tag, FileText, Calendar, RefreshCw, Phone, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { activitiesApi } from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import type { ActivityRecord } from '@/types';

// Map backend ActivityType enum values to UI categories
const typeToCategory = (type: string): string => {
  const t = type?.toUpperCase() || ''
  if (t.startsWith('STATUS_') || t.startsWith('STAGE_') || t.startsWith('SCORE_')) return 'status'
  if (t.startsWith('EMAIL_')) return 'email'
  if (t.startsWith('SMS_')) return 'sms'
  if (t.startsWith('CALL_')) return 'call'
  if (t.startsWith('NOTE_')) return 'note'
  if (t.startsWith('TASK_')) return 'task'
  if (t.startsWith('MEETING_')) return 'meeting'
  if (t.startsWith('LEAD_')) return 'lead'
  if (t.startsWith('TAG_')) return 'status'
  if (t.startsWith('DOCUMENT_')) return 'task'
  if (t.startsWith('CAMPAIGN_')) return 'email'
  // Fallback for lowercase types from older data
  if (t === 'STATUS_CHANGE') return 'status'
  return 'other'
}

const formatTitle = (type: string): string => {
  const titles: Record<string, string> = {
    'STATUS_CHANGED': 'Status Changed',
    'STAGE_CHANGED': 'Stage Changed',
    'SCORE_CHANGED': 'Score Changed',
    'EMAIL_SENT': 'Email Sent',
    'EMAIL_OPENED': 'Email Opened',
    'EMAIL_CLICKED': 'Email Clicked',
    'EMAIL_RECEIVED': 'Email Received',
    'SMS_SENT': 'SMS Sent',
    'SMS_DELIVERED': 'SMS Delivered',
    'CALL_MADE': 'Call Made',
    'CALL_RECEIVED': 'Call Received',
    'CALL_LOGGED': 'Call Logged',
    'NOTE_ADDED': 'Note Added',
    'NOTE_EDITED': 'Note Edited',
    'NOTE_DELETED': 'Note Deleted',
    'TASK_CREATED': 'Task Created',
    'TASK_COMPLETED': 'Task Completed',
    'MEETING_SCHEDULED': 'Meeting Scheduled',
    'MEETING_COMPLETED': 'Meeting Completed',
    'DOCUMENT_UPLOADED': 'Document Uploaded',
    'DOCUMENT_DELETED': 'Document Deleted',
    'TAG_ADDED': 'Tag Added',
    'TAG_REMOVED': 'Tag Removed',
    'LEAD_CREATED': 'Lead Created',
    'LEAD_ASSIGNED': 'Lead Assigned',
    'LEAD_REASSIGNED': 'Lead Reassigned',
    'LEAD_MERGED': 'Lead Merged',
    'LEAD_IMPORTED': 'Lead Imported',
    'CAMPAIGN_LAUNCHED': 'Campaign Launched',
    'CAMPAIGN_COMPLETED': 'Campaign Completed',
  }
  return titles[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Activity'
}

const getIconForType = (type: string): React.ElementType => {
  const cat = typeToCategory(type)
  const icons: Record<string, React.ElementType> = {
    'status': Tag,
    'email': FileText,
    'sms': MessageSquare,
    'call': Phone,
    'note': FileText,
    'task': Calendar,
    'meeting': Calendar,
    'lead': User,
  }
  return icons[cat] || History
}

const getColorForType = (type: string): string => {
  const cat = typeToCategory(type)
  const colors: Record<string, string> = {
    'status': 'blue',
    'email': 'green',
    'sms': 'teal',
    'call': 'orange',
    'note': 'purple',
    'task': 'orange',
    'meeting': 'blue',
    'lead': 'blue',
  }
  return colors[cat] || 'gray'
}

// Map filter categories to backend activity type prefixes for server-side filtering
const CATEGORY_TYPE_PREFIXES: Record<string, string[]> = {
  status: ['STATUS_CHANGED', 'STAGE_CHANGED', 'SCORE_CHANGED', 'TAG_ADDED', 'TAG_REMOVED'],
  email: ['EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_RECEIVED', 'CAMPAIGN_LAUNCHED', 'CAMPAIGN_COMPLETED'],
  sms: ['SMS_SENT', 'SMS_DELIVERED'],
  call: ['CALL_MADE', 'CALL_RECEIVED', 'CALL_LOGGED'],
  note: ['NOTE_ADDED', 'NOTE_EDITED', 'NOTE_DELETED'],
  task: ['TASK_CREATED', 'TASK_COMPLETED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED'],
}

const LeadHistory = () => {
  const [searchParams] = useSearchParams();
  const leadIdParam = searchParams.get('leadId');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedLeadId] = useState<string>(leadIdParam || '');
  const [page, setPage] = useState(1);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };
  const PAGE_SIZE = 50;

  // Fetch accurate stats from dedicated stats endpoint
  const { data: statsData } = useQuery({
    queryKey: ['lead-activity-stats'],
    queryFn: async () => {
      const response = await activitiesApi.getActivityStats();
      const data = response.data;
      const byType = data?.byType || {};
      const categorize = (types: string[]) => types.reduce((sum: number, t: string) => sum + (byType[t] || 0), 0);
      return {
        total: data?.total || 0,
        statusChanges: categorize(['STATUS_CHANGED', 'STAGE_CHANGED', 'SCORE_CHANGED', 'TAG_ADDED', 'TAG_REMOVED']),
        emails: categorize(['EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_RECEIVED', 'CAMPAIGN_LAUNCHED', 'CAMPAIGN_COMPLETED']),
        sms: categorize(['SMS_SENT', 'SMS_DELIVERED']),
        notes: categorize(['NOTE_ADDED', 'NOTE_EDITED', 'NOTE_DELETED']),
        tasks: categorize(['TASK_CREATED', 'TASK_COMPLETED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED']),
        calls: categorize(['CALL_MADE', 'CALL_RECEIVED', 'CALL_LOGGED']),
      };
    },
  });

  const { data: activitiesData, isLoading, isError, error, refetch: loadActivities } = useQuery({
    queryKey: ['lead-activity-history', selectedLeadId, page, activeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { limit: PAGE_SIZE, page };
      if (selectedLeadId) {
        params.leadId = selectedLeadId;
      }
      if (activeFilter !== 'all' && CATEGORY_TYPE_PREFIXES[activeFilter]) {
        params.type = CATEGORY_TYPE_PREFIXES[activeFilter].join(',');
      }
      const response = await activitiesApi.getActivities(params);
      const activities = response.data?.activities || [];
      const pagination = response.data?.pagination || { total: 0, pages: 1 };

      const timelineItems = activities.map((activity: ActivityRecord, index: number) => {
        const leadName = activity.lead && typeof activity.lead === 'object' && 'firstName' in activity.lead
          ? `${activity.lead.firstName} ${activity.lead.lastName}`.trim()
          : null

        return {
          id: activity.id || index,
          type: activity.type || 'activity',
          category: typeToCategory(activity.type),
          title: formatTitle(activity.type),
          description: leadName
            ? `${leadName} — ${activity.description || 'No details'}`
            : activity.description || 'No description',
          user: activity.user && typeof activity.user !== 'string'
            ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || 'System'
            : typeof activity.user === 'string' ? activity.user : 'System',
          timestamp: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown',
          icon: getIconForType(activity.type),
          color: getColorForType(activity.type),
        }
      });

      return { timeline: timelineItems, pagination };
    },
  });

  const allTimeline = useMemo(() => activitiesData?.timeline ?? [], [activitiesData?.timeline]);
  const pagination = activitiesData?.pagination ?? { total: 0, pages: 1 };
  const stats = statsData ?? { total: 0, statusChanges: 0, emails: 0, sms: 0, notes: 0, tasks: 0, calls: 0 };

  const timeline = allTimeline;

  const displayStats = [
    { label: 'Total Activities', value: stats.total.toString() },
    { label: 'Status Changes', value: stats.statusChanges.toString() },
    { label: 'Emails', value: stats.emails.toString() },
    { label: 'SMS', value: stats.sms.toString() },
    { label: 'Notes', value: stats.notes.toString() },
    { label: 'Tasks', value: stats.tasks.toString() },
    { label: 'Calls', value: stats.calls.toString() },
  ];

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Activity History</h1>
          <p className="text-muted-foreground mt-2">
            Complete timeline of all lead interactions and changes
          </p>
        </div>
        <Button onClick={() => { loadActivities(); }} disabled={isLoading}>
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
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {displayStats.map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter Activities - above timeline for discoverability */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Activities</CardTitle>
          <CardDescription>Show specific types of activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={activeFilter === 'all' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('all')}
            >
              All Activities ({stats.total})
            </Badge>
            <Badge 
              variant={activeFilter === 'status' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('status')}
            >
              Status Changes ({stats.statusChanges})
            </Badge>
            <Badge 
              variant={activeFilter === 'email' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('email')}
            >
              Emails ({stats.emails})
            </Badge>
            <Badge 
              variant={activeFilter === 'sms' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('sms')}
            >
              SMS ({stats.sms})
            </Badge>
            <Badge 
              variant={activeFilter === 'note' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('note')}
            >
              Notes ({stats.notes})
            </Badge>
            <Badge 
              variant={activeFilter === 'task' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('task')}
            >
              Tasks ({stats.tasks})
            </Badge>
            <Badge 
              variant={activeFilter === 'call' ? 'default' : 'outline'} 
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleFilterChange('call')}
            >
              Calls ({stats.calls})
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {pagination.total > 0
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, pagination.total)} of ${pagination.total} activities`
              : 'Chronological history of all lead activities'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorBanner message={`Failed to load activity history: ${error instanceof Error ? error.message : 'Unknown error'}`} retry={loadActivities} />
          ) : isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">No activities found</h3>
              <p className="text-sm text-muted-foreground">
                {activeFilter !== 'all'
                  ? 'No activities match the selected filter. Try selecting "All Activities".'
                  : 'Activity history will appear here as leads are created and updated.'}
              </p>
            </div>
          ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

            <div className="space-y-6">
              {timeline.map((event: { id: string | number; type: string; title: string; description: string; user: string; timestamp: string; icon: React.ElementType; color: string }) => {
                const IconComponent = event.icon;
                return (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center h-12 w-12 rounded-full border-4 border-background ${
                        event.color === 'blue'
                          ? 'bg-primary'
                          : event.color === 'green'
                          ? 'bg-info'
                          : event.color === 'purple'
                          ? 'bg-primary'
                          : event.color === 'orange'
                          ? 'bg-warning'
                          : event.color === 'teal'
                          ? 'bg-info'
                          : 'bg-muted-foreground'
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
                            {event.type.replace(/_/g, ' ')}
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

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadHistory;
