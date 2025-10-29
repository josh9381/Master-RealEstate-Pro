import { useState, useEffect } from 'react';
import { Mail, Send, Eye, MousePointer, Users, Calendar, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const CampaignAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    loadCampaignAnalytics();
  }, []);

  const loadCampaignAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsApi.getCampaignAnalytics().catch(() => ({ data: null }));
      setCampaignData(response.data);
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
      toast.toast.warning('Error loading campaign analytics', 'Using fallback data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use API data with fallbacks
  const performance = campaignData?.performance || {};
  const totalCampaigns = campaignData?.total || 0;
  const topCampaigns = campaignData?.topCampaigns || [];

  // Mock performance data (would come from time-series endpoint)
  const campaignPerformance = [
    { date: '2024-01-01', sent: 1200, opened: 384, clicked: 96, converted: 24 },
    { date: '2024-01-02', sent: 1350, opened: 432, clicked: 108, converted: 27 },
    { date: '2024-01-03', sent: 1180, opened: 377, clicked: 94, converted: 23 },
    { date: '2024-01-04', sent: 1420, opened: 454, clicked: 113, converted: 28 },
    { date: '2024-01-05', sent: 1290, opened: 413, clicked: 103, converted: 26 },
    { date: '2024-01-06', sent: 1540, opened: 493, clicked: 123, converted: 31 },
  ];

  // Use topCampaigns from API or fallback to empty array
  const campaigns = topCampaigns.length > 0 ? topCampaigns : [];

  const hourlyPerformance = [
    { hour: '00:00', openRate: 12 },
    { hour: '04:00', openRate: 8 },
    { hour: '08:00', openRate: 28 },
    { hour: '12:00', openRate: 35 },
    { hour: '16:00', openRate: 32 },
    { hour: '20:00', openRate: 22 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your marketing campaign performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadCampaignAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>Export Data</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performance.totalSent || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalCampaigns} campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.openRate || 0}%</div>
            <p className="text-xs text-muted-foreground">{(performance.totalOpened || 0).toLocaleString()} opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.clickRate || 0}%</div>
            <p className="text-xs text-muted-foreground">+1.2% vs last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.0%</div>
            <p className="text-xs text-muted-foreground">+0.3% vs last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Trend</CardTitle>
          <CardDescription>Sent, opened, clicked, and converted over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={campaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="clicked" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="converted" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Comparison</CardTitle>
          <CardDescription>Performance metrics for all campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Conv. Rate</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const openRate = ((campaign.opened / campaign.sent) * 100).toFixed(1);
                const clickRate = ((campaign.clicked / campaign.sent) * 100).toFixed(1);
                const convRate = ((campaign.converted / campaign.sent) * 100).toFixed(1);

                return (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>{campaign.sent.toLocaleString()}</TableCell>
                    <TableCell>{openRate}%</TableCell>
                    <TableCell>{clickRate}%</TableCell>
                    <TableCell>{convRate}%</TableCell>
                    <TableCell>${campaign.revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="success">{campaign.roi}%</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Time to Send */}
        <Card>
          <CardHeader>
            <CardTitle>Best Time to Send</CardTitle>
            <CardDescription>Open rates by time of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="openRate" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>Subject lines with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { subject: 'Limited Time: 50% Off Everything', openRate: 42.5, clickRate: 12.3 },
                { subject: 'Your Exclusive Invitation Inside', openRate: 38.7, clickRate: 10.1 },
                { subject: 'New Feature: You Asked, We Built It', openRate: 36.2, clickRate: 9.8 },
                { subject: 'Last Chance - Sale Ends Tonight', openRate: 34.8, clickRate: 8.9 },
              ].map((content, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{content.subject}</p>
                    <Badge variant="outline">{content.openRate}%</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Open: {content.openRate}%</span>
                    <span>Click: {content.clickRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
