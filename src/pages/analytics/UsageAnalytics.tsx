import { Activity, Clock, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  const usageData = [
    { date: 'Jan 1', users: 45, apiCalls: 12340, storage: 8.2 },
    { date: 'Jan 5', users: 52, apiCalls: 15670, storage: 8.5 },
    { date: 'Jan 10', users: 48, apiCalls: 13890, storage: 8.9 },
    { date: 'Jan 15', users: 61, apiCalls: 18920, storage: 9.2 },
    { date: 'Jan 20', users: 58, apiCalls: 17450, storage: 9.5 },
  ];

  const topUsers = [
    { name: 'John Doe', logins: 145, actions: 2340, lastActive: '2 min ago' },
    { name: 'Sarah Johnson', logins: 132, actions: 2103, lastActive: '15 min ago' },
    { name: 'Mike Wilson', logins: 118, actions: 1876, lastActive: '1 hour ago' },
    { name: 'Emily Brown', logins: 107, actions: 1654, lastActive: '3 hours ago' },
  ];

  const featureUsage = [
    { feature: 'Lead Management', usage: 3450, percentage: 32 },
    { feature: 'Email Campaigns', usage: 2876, percentage: 27 },
    { feature: 'Analytics', usage: 1987, percentage: 18 },
    { feature: 'Workflows', usage: 1234, percentage: 12 },
    { feature: 'Reports', usage: 890, percentage: 8 },
    { feature: 'Settings', usage: 321, percentage: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track system usage, user activity, and resource consumption
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17,450</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.5 GB</div>
            <p className="text-xs text-muted-foreground">of 50 GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24m 36s</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>User activity and resource consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
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
              {topUsers.map((user, index) => (
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
              ))}
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
              {featureUsage.map((item) => (
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
              ))}
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
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">3.2 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">4.1 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Backups</span>
                  <span className="font-medium">1.8 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Other</span>
                  <span className="font-medium">0.4 GB</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>9.5 GB / 50 GB</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '19%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Usage */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">API Usage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads API</span>
                  <span className="font-medium">6,234</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campaigns API</span>
                  <span className="font-medium">4,567</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Analytics API</span>
                  <span className="font-medium">3,890</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Webhooks</span>
                  <span className="font-medium">2,759</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>17,450 / 100K</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '17.5%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bandwidth */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-4">Bandwidth</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inbound</span>
                  <span className="font-medium">12.3 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Outbound</span>
                  <span className="font-medium">8.7 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CDN</span>
                  <span className="font-medium">15.2 GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Other</span>
                  <span className="font-medium">3.8 GB</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>40 GB / 500 GB</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                  </div>
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
            {[
              {
                user: 'John Doe',
                action: 'Created 3 new leads',
                time: '2 minutes ago',
                type: 'create',
              },
              {
                user: 'Sarah Johnson',
                action: 'Sent email campaign to 2,340 recipients',
                time: '15 minutes ago',
                type: 'send',
              },
              {
                user: 'Mike Wilson',
                action: 'Updated lead status (5 leads)',
                time: '1 hour ago',
                type: 'update',
              },
              {
                user: 'System',
                action: 'Automated backup completed',
                time: '2 hours ago',
                type: 'system',
              },
              {
                user: 'Emily Brown',
                action: 'Exported analytics report',
                time: '3 hours ago',
                type: 'export',
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium">
                    {activity.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <Badge variant="secondary">{activity.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;
