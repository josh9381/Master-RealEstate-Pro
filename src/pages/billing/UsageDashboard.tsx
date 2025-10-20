import { CreditCard, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UsageDashboard = () => {
  const usageData = [
    { month: 'Jul', users: 45, apiCalls: 125000, storage: 3.2 },
    { month: 'Aug', users: 48, apiCalls: 145000, storage: 3.8 },
    { month: 'Sep', users: 52, apiCalls: 167000, storage: 4.2 },
    { month: 'Oct', users: 56, apiCalls: 198000, storage: 4.9 },
    { month: 'Nov', users: 58, apiCalls: 234000, storage: 5.6 },
    { month: 'Dec', users: 58, apiCalls: 267000, storage: 6.1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your subscription usage and limits
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-blue-900">Professional Plan</h3>
              <p className="text-blue-800 mt-1">$99/month • Billed annually</p>
            </div>
            <Button>Manage Plan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58 / 100</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '58%' }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">267K / 500K</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '53%' }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.1GB / 50GB</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '12%' }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Sends</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23K / 100K</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '23%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Users"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="apiCalls"
                stroke="#10b981"
                strokeWidth={2}
                name="API Calls"
              />
            </LineChart>
          </ResponsiveContainer>
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
            {[
              { feature: 'Email Campaigns', usage: 85, limit: 100, unit: '%' },
              { feature: 'Lead Management', usage: 12450, limit: 25000, unit: 'leads' },
              { feature: 'Automations', usage: 23, limit: 50, unit: 'workflows' },
              { feature: 'Integrations', usage: 5, limit: 10, unit: 'active' },
            ].map((item) => (
              <div key={item.feature}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.feature}</span>
                  <span className="text-sm text-muted-foreground">
                    {typeof item.usage === 'number' && item.usage > 100
                      ? item.usage.toLocaleString()
                      : item.usage}
                    {item.unit === '%' ? '%' : ''} /{' '}
                    {item.limit.toLocaleString()}
                    {item.unit !== '%' ? ` ${item.unit}` : item.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (item.usage / item.limit) * 100 > 80
                        ? 'bg-red-600'
                        : (item.usage / item.limit) * 100 > 60
                        ? 'bg-orange-600'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${(item.usage / item.limit) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle */}
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>December 1 - December 31, 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Days Remaining</p>
                  <p className="text-xs text-muted-foreground">Until next billing</p>
                </div>
              </div>
              <span className="text-2xl font-bold">16 days</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Current Charges</p>
                  <p className="text-xs text-muted-foreground">Base plan + overages</p>
                </div>
              </div>
              <span className="text-2xl font-bold">$99.00</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Next Payment</p>
                  <p className="text-xs text-muted-foreground">January 1, 2025</p>
                </div>
              </div>
              <span className="text-2xl font-bold">$99.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overage Warnings */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle>Usage Alerts</CardTitle>
          <CardDescription>Warnings and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900">Approaching Email Limit</h4>
                <p className="text-sm text-orange-800 mt-1">
                  You've used 85% of your monthly email sends. Consider upgrading or purchase
                  additional sends.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Past billing cycles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { period: 'Nov 1 - Nov 30, 2024', users: 56, apiCalls: '234K', storage: '5.6GB', cost: '$99.00' },
              { period: 'Oct 1 - Oct 31, 2024', users: 52, apiCalls: '198K', storage: '4.9GB', cost: '$99.00' },
              { period: 'Sep 1 - Sep 30, 2024', users: 48, apiCalls: '167K', storage: '4.2GB', cost: '$99.00' },
            ].map((history, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">{history.period}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {history.users} users • {history.apiCalls} API calls • {history.storage} storage
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">{history.cost}</span>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Resources?</CardTitle>
          <CardDescription>Upgrade your plan for higher limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Professional Plan</h4>
              <p className="text-2xl font-bold mb-3">$99/mo</p>
              <ul className="space-y-2 text-sm">
                <li>✓ 100 users</li>
                <li>✓ 500K API calls/month</li>
                <li>✓ 50GB storage</li>
                <li>✓ 100K emails/month</li>
              </ul>
              <Badge className="mt-3">Current Plan</Badge>
            </div>
            <div className="p-4 border-2 border-blue-500 rounded-lg">
              <h4 className="font-semibold mb-2">Enterprise Plan</h4>
              <p className="text-2xl font-bold mb-3">$299/mo</p>
              <ul className="space-y-2 text-sm">
                <li>✓ Unlimited users</li>
                <li>✓ 5M API calls/month</li>
                <li>✓ 500GB storage</li>
                <li>✓ 1M emails/month</li>
              </ul>
              <Button className="mt-3 w-full">Upgrade Now</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageDashboard;
