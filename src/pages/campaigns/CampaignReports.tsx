import { BarChart3, TrendingUp, Users, Mail, MousePointer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CampaignReports = () => {
  const performanceData = [
    { date: 'Jan 1', sent: 1200, delivered: 1180, opened: 472, clicked: 94 },
    { date: 'Jan 5', sent: 1500, delivered: 1485, opened: 594, clicked: 119 },
    { date: 'Jan 10', sent: 1800, delivered: 1782, opened: 713, clicked: 143 },
    { date: 'Jan 15', sent: 2100, delivered: 2079, opened: 832, clicked: 166 },
    { date: 'Jan 20', sent: 1900, delivered: 1881, opened: 752, clicked: 150 },
  ];

  const campaigns = [
    {
      id: 1,
      name: 'Spring Product Launch',
      type: 'Email',
      sent: 8450,
      delivered: 8366,
      opened: 2676,
      clicked: 670,
      bounced: 84,
      unsubscribed: 12,
      revenue: 45230,
    },
    {
      id: 2,
      name: 'Customer Survey',
      type: 'Email',
      sent: 5230,
      delivered: 5178,
      opened: 2071,
      clicked: 518,
      bounced: 52,
      unsubscribed: 8,
      revenue: 0,
    },
    {
      id: 3,
      name: 'Flash Sale SMS',
      type: 'SMS',
      sent: 3200,
      delivered: 3180,
      opened: 2862,
      clicked: 510,
      bounced: 20,
      unsubscribed: 5,
      revenue: 28400,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Reports</h1>
          <p className="text-muted-foreground mt-2">
            Detailed performance analytics for all campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Export Report</Button>
          <Button variant="outline">Schedule Report</Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23,660</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.1%</div>
            <p className="text-xs text-muted-foreground">23,452 delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32.4%</div>
            <p className="text-xs text-muted-foreground">7,599 opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.2%</div>
            <p className="text-xs text-muted-foreground">1,930 clicked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$73,630</div>
            <p className="text-xs text-muted-foreground">From 3 campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Over Time</CardTitle>
          <CardDescription>Delivery, open, and click trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
              <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" />
              <Line type="monotone" dataKey="opened" stroke="#f59e0b" name="Opened" />
              <Line type="monotone" dataKey="clicked" stroke="#8b5cf6" name="Clicked" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Details</CardTitle>
          <CardDescription>Individual campaign metrics and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <Badge variant="secondary">{campaign.type}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Full Report
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Sent */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sent</p>
                    <p className="text-2xl font-bold">{campaign.sent.toLocaleString()}</p>
                  </div>

                  {/* Delivered */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Delivered</p>
                    <p className="text-2xl font-bold">{campaign.delivered.toLocaleString()}</p>
                    <p className="text-xs text-green-600">
                      {((campaign.delivered / campaign.sent) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Opened */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Opened</p>
                    <p className="text-2xl font-bold">{campaign.opened.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">
                      {((campaign.opened / campaign.delivered) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Clicked */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clicked</p>
                    <p className="text-2xl font-bold">{campaign.clicked.toLocaleString()}</p>
                    <p className="text-xs text-purple-600">
                      {((campaign.clicked / campaign.opened) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  {/* Bounced */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bounced</p>
                    <p className="text-lg font-semibold">{campaign.bounced}</p>
                    <p className="text-xs text-red-600">
                      {((campaign.bounced / campaign.sent) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Unsubscribed */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unsubscribed</p>
                    <p className="text-lg font-semibold">{campaign.unsubscribed}</p>
                    <p className="text-xs text-muted-foreground">
                      {((campaign.unsubscribed / campaign.sent) * 100).toFixed(2)}%
                    </p>
                  </div>

                  {/* Revenue */}
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Revenue Generated</p>
                    <p className="text-lg font-semibold">
                      ${campaign.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600">
                      ROI: {campaign.revenue > 0 ? '+2,450%' : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Funnel</CardTitle>
          <CardDescription>Step-by-step engagement breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { stage: 'Sent', count: 23660, percentage: 100, color: 'bg-blue-500' },
              { stage: 'Delivered', count: 23452, percentage: 99.1, color: 'bg-green-500' },
              { stage: 'Opened', count: 7599, percentage: 32.4, color: 'bg-orange-500' },
              { stage: 'Clicked', count: 1930, percentage: 8.2, color: 'bg-purple-500' },
              { stage: 'Converted', count: 234, percentage: 1.0, color: 'bg-pink-500' },
            ].map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`}></div>
                    <span className="font-medium">{stage.stage}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stage.count.toLocaleString()} ({stage.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${stage.color}`}
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Performing */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best Open Rate</CardTitle>
            <CardDescription>Campaigns with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Flash Sale SMS', rate: 89.9, type: 'SMS' },
                { name: 'Customer Survey', rate: 40.0, type: 'Email' },
                { name: 'Spring Launch', rate: 32.0, type: 'Email' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {item.type}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{item.rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Click Rate</CardTitle>
            <CardDescription>Campaigns driving most clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Flash Sale SMS', rate: 16.0, type: 'SMS' },
                { name: 'Customer Survey', rate: 10.0, type: 'Email' },
                { name: 'Spring Launch', rate: 7.9, type: 'Email' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {item.type}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{item.rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignReports;
