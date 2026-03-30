import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Bell, CheckCircle2, Clock, AlertTriangle, BarChart3, TrendingUp, MonitorSmartphone, BellRing
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { formatRate } from '@/lib/metricsCalculator';

const MONTH_OPTIONS = [
  { value: 1, label: 'Last Month' },
  { value: 3, label: 'Last 3 Months' },
  { value: 6, label: 'Last 6 Months' },
  { value: 12, label: 'Last Year' },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444',
};

const FollowUpAnalytics = () => {
  const [months, setMonths] = useState(3);

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['follow-up-analytics', months],
    queryFn: async () => {
      const response = await analyticsApi.getFollowUpAnalytics({ months });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted dark:bg-gray-700 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={(error as Error)?.message || 'Failed to load follow-up analytics'} retry={refetch} />
      </div>
    );
  }

  const summary = result?.summary || {};
  const byPriority = result?.byPriority || [];
  const channelUsage = result?.channelUsage || {};
  const monthlyTrend = result?.monthlyTrend || [];

  const statusData = [
    { name: 'Completed', value: summary.completed || 0, color: '#10b981' },
    { name: 'Fired', value: summary.fired || 0, color: '#3b82f6' },
    { name: 'Pending', value: summary.pending || 0, color: '#f59e0b' },
    { name: 'Overdue', value: summary.overdue || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const channelData = [
    { name: 'In-App', value: channelUsage.inApp || 0 },
    { name: 'Email', value: channelUsage.email || 0 },
    { name: 'SMS', value: channelUsage.sms || 0 },
    { name: 'Push', value: channelUsage.push || 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <Bell className="h-7 w-7 text-indigo-600" />
            Follow-Up Analytics
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">
            Track follow-up completion rates, response times, and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          {MONTH_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={months === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMonths(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Total Follow-Ups</p>
                <p className="text-2xl font-bold text-foreground dark:text-white">{summary.total || 0}</p>
              </div>
              <BellRing className="h-8 w-8 text-indigo-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{formatRate(summary.completionRate || 0)}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-600">{summary.avgResponseHours || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{summary.overdue || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} (${formatRate(percent * 100, 0)}%)`}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Channel Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Channel Usage
            </CardTitle>
            <CardDescription>How follow-ups are delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
            <CardDescription>Follow-up creation vs completion over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="fired" stroke="#f59e0b" strokeWidth={2} name="Fired" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Priority Breakdown */}
      {byPriority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completion by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byPriority.map((p: any) => (
                <div key={p.priority} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium" style={{ color: PRIORITY_COLORS[p.priority] || '#6b7280' }}>
                    {p.priority}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{p.completed} / {p.total} completed</span>
                      <span>{formatRate(p.completionRate)}%</span>
                    </div>
                    <div className="h-3 bg-muted dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p.completionRate}%`,
                          backgroundColor: PRIORITY_COLORS[p.priority] || '#6b7280',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground dark:text-muted-foreground mb-2">No Follow-Up Data</h3>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Analytics will appear once you start creating follow-up reminders on your leads.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FollowUpAnalytics;
