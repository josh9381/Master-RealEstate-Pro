import { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Users, Zap, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    loadUsageData();
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadUsageData();
    };
    fetchData();
  }, []);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      const dateParams = dateRangeRef.current;
      const [dashboard, activity] = await Promise.all([
        analyticsApi.getDashboardStats(dateParams),
        analyticsApi.getActivityFeed(),
      ]);
      setDashboardData(dashboard);
      setActivityData(activity?.activities || []);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  // Usage data derived from activity feed
  const usageData = activityData.length > 0
    ? Object.values(
        activityData.reduce((acc: Record<string, { date: string; users: number; apiCalls: number; storage: number }>, activity: any) => {
          const date = (activity.createdAt || activity.time || '').split('T')[0];
          if (!date) return acc;
          if (!acc[date]) {
            acc[date] = { date, users: 0, apiCalls: 0, storage: 0 };
          }
          acc[date].apiCalls++;
          acc[date].users = Math.max(acc[date].users, 1);
          return acc;
        }, {})
      ).slice(-14) as { date: string; users: number; apiCalls: number; storage: number }[]
    : [];

  // Active users derived from activity data
  const topUsers = activityData.length > 0
    ? Object.values(
        activityData.reduce((acc: Record<string, { name: string; logins: number; actions: number; lastActive: string }>, activity: any) => {
          const name = activity.userName || activity.user || 'Unknown';
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
          percentage: Math.round((usage / total) * 100)
        })).sort((a, b) => b.usage - a.usage).slice(0, 8);
      })()
    : [] as { feature: string; usage: number; percentage: number }[];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
        <div className="h-64 bg-muted rounded" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track system usage, user activity, and resource consumption
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={loadUsageData} disabled={loading}>
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
            <div className="text-2xl font-bold">{dashboardData?.stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">In system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.stats?.totalCampaigns || 0}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.stats?.avgSessionTime || '—'}</div>
            <p className="text-xs text-muted-foreground">This week</p>
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
                dataKey="apiCalls"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                name="API Calls (hundreds)"
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
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.logins} logins • {user.actions} actions
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{user.lastActive}</Badge>
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
              <h4 className="font-semibold mb-4">Storage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">{dashboardData?.stats?.storage?.database || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">{dashboardData?.stats?.storage?.documents || '—'}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>{dashboardData?.stats?.storage?.total || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* API Usage */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">API Usage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total API Calls</span>
                  <span className="font-medium">{dashboardData?.stats?.apiCalls || '—'}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Status</span>
                    <span>{dashboardData?.stats?.apiCalls ? 'Active' : 'No data'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">System</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Leads</span>
                  <span className="font-medium">{dashboardData?.stats?.totalLeads || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campaigns</span>
                  <span className="font-medium">{dashboardData?.stats?.totalCampaigns || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Workflows</span>
                  <span className="font-medium">{dashboardData?.stats?.totalWorkflows || 0}</span>
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
                    {(activity.userName || activity.user || 'S').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.userName || activity.user || 'System'}</span>{' '}
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
