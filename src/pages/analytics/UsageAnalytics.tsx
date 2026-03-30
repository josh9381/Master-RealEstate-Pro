import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, Users, Zap, RefreshCw } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { analyticsApi } from '@/lib/api';
import { calcRate } from '@/lib/metricsCalculator';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const UsageAnalytics = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const { data: usageResult, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['usage-analytics'],
    queryFn: async () => {
      const dateParams = dateRangeRef.current;
      const [dashboard, activity] = await Promise.all([
        analyticsApi.getDashboardStats(dateParams),
        analyticsApi.getActivityFeed({ startDate: dateParams.startDate, endDate: dateParams.endDate, limit: 200 }),
      ]);
      return {
        dashboardData: dashboard?.data || dashboard,
        activityData: activity?.data?.activities || activity?.activities || [],
      };
    },
  });

  const dashboardData = usageResult?.dashboardData ?? null;
  const activityData = usageResult?.activityData ?? [];

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  // Usage data derived from activity feed
  const usageData = activityData.length > 0
    ? Object.values(
        activityData.reduce((acc: Record<string, { date: string; users: number; activities: number; storage: number; _userSet: Set<string> }>, activity: any) => {
          const date = (activity.createdAt || activity.time || '').split('T')[0];
          if (!date) return acc;
          if (!acc[date]) {
            acc[date] = { date, users: 0, activities: 0, storage: 0, _userSet: new Set() };
          }
          acc[date].activities++;
          const userId = activity.userId || activity.user?.id || activity.userName || 'unknown';
          acc[date]._userSet.add(userId);
          acc[date].users = acc[date]._userSet.size;
          return acc;
        }, {})
      ).map(({ date, users, activities, storage }: any) => ({ date, users, activities, storage })).slice(-14) as { date: string; users: number; activities: number; storage: number }[]
    : [];

  // Active users derived from activity data
  const topUsers = activityData.length > 0
    ? Object.values(
        activityData.reduce((acc: Record<string, { name: string; logins: number; actions: number; lastActive: string }>, activity: any) => {
          const user = activity.user;
          const name = activity.userName
            || (typeof user === 'object' && user !== null
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name
                : user)
            || 'Unknown';
          if (!acc[name]) {
            acc[name] = { name, logins: 0, actions: 0, lastActive: '' };
          }
          acc[name].actions++;
          acc[name].lastActive = activity.createdAt || activity.time || '';
          return acc;
        }, {})
      ).slice(0, 4) as { name: string; logins: number; actions: number; lastActive: string }[]
    : [];

  // Feature usage — derived from activity types
  const featureUsage = activityData.length > 0
    ? (() => {
        const typeCounts: Record<string, number> = {};
        activityData.forEach((a: any) => {
          const type = a.type || a.activityType || 'other';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const total = activityData.length;
        return Object.entries(typeCounts).map(([feature, usage]) => ({
          feature: feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, ' '),
          usage,
          percentage: calcRate(usage, total, 0)
        })).sort((a, b) => b.usage - a.usage).slice(0, 8);
      })()
    : [] as { feature: string; usage: number; percentage: number }[];

  if (loading) {
    return <LoadingSkeleton rows={4} showChart={true} />;
  }

  return (
    <div className="space-y-6">
      {isError && (
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load usage data'} retry={() => refetch()} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track system usage, user activity, and resource consumption
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityData.length}</div>
            <p className="text-xs text-muted-foreground">Recent activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.overview?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">In system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.overview?.totalCampaigns || dashboardData?.campaigns?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.tasks?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">{dashboardData?.tasks?.completionRate || 0}% completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Page-level empty state when no activity data exists */}
      {activityData.length === 0 && (
        <AnalyticsEmptyState variant="usage" />
      )}

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>User activity and resource consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="users"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Active Users"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="activities"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                name="Activities"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No usage trend data yet
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
            <CardDescription>Users with highest activity this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topUsers.length > 0 ? topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 font-bold text-primary">
                      {(user.name || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.logins} logins • {user.actions} actions
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}</Badge>
                </div>
              )) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No user activity data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Most used features this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featureUsage.length > 0 ? featureUsage.map((item) => (
                <div key={item.feature}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.feature}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.usage.toLocaleString()} uses
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No feature usage data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage Details</CardTitle>
          <CardDescription>Detailed breakdown of system resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Storage */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">CRM Overview</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Leads</span>
                  <span className="font-medium">{dashboardData?.overview?.totalLeads || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Campaigns</span>
                  <span className="font-medium">{dashboardData?.overview?.totalCampaigns || 0}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Tasks</span>
                    <span>{dashboardData?.overview?.totalTasks || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* API Usage */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">Campaigns</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Campaigns</span>
                  <span className="font-medium">{dashboardData?.overview?.activeCampaigns || 0}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Activities</span>
                    <span>{dashboardData?.activities?.total || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">Tasks</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Task Completion</span>
                  <span className="font-medium">{dashboardData?.tasks?.completionRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overdue Tasks</span>
                  <span className="font-medium">{dashboardData?.tasks?.overdue || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Due Today</span>
                  <span className="font-medium">{dashboardData?.tasks?.dueToday || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest user actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityData.length > 0 ? activityData.slice(0, 5).map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium">
                    {(activity.userName || (typeof activity.user === 'object' && activity.user !== null ? activity.user.firstName || activity.user.name : activity.user) || 'S').toString().charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.userName || (typeof activity.user === 'object' && activity.user !== null ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || activity.user.name : activity.user) || 'System'}</span>{' '}
                      {activity.description || activity.action || 'performed an action'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : activity.time || ''}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{activity.type || 'action'}</Badge>
              </div>
            )) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No recent activity yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;
