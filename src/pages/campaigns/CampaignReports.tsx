import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, Mail, MousePointer, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const TYPE_DISPLAY: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PHONE: 'Phone',
  SOCIAL: 'Social',
};

const CampaignReports = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    revenue: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await campaignsApi.getCampaigns();
      const allCampaigns = response.data?.campaigns || response.campaigns || [];

      // Transform campaigns to include calculated metrics from real data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedCampaigns = allCampaigns.map((c: any) => {
        const sent = c.recipientCount || c.sent || 0;
        const delivered = c.delivered || 0;
        const opened = c.opens || c.opened || 0;
        const clicked = c.clicks || c.clicked || 0;
        const bounced = c.bounced || 0;
        const unsubscribed = c.unsubscribed || 0;
        const revenue = c.revenue || 0;

        return {
          ...c,
          type: TYPE_DISPLAY[(c.type || '').toUpperCase()] || c.type || 'Unknown',
          sent,
          delivered,
          opened,
          clicked,
          bounced,
          unsubscribed,
          revenue,
        };
      });

      setCampaigns(enrichedCampaigns);

      // Calculate overall stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSent = enrichedCampaigns.reduce((sum: number, c: any) => sum + c.sent, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalDelivered = enrichedCampaigns.reduce((sum: number, c: any) => sum + c.delivered, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalOpened = enrichedCampaigns.reduce((sum: number, c: any) => sum + c.opened, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalClicked = enrichedCampaigns.reduce((sum: number, c: any) => sum + c.clicked, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRevenue = enrichedCampaigns.reduce((sum: number, c: any) => sum + c.revenue, 0);

      setStats({
        totalSent,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        revenue: totalRevenue,
      });

      // Generate performance trend data sorted by campaign creation date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trend = [...enrichedCampaigns]
        .filter((c: any) => c.sent > 0)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((c: any) => ({
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sent: c.sent,
          delivered: c.delivered,
          opened: c.opened,
          clicked: c.clicked,
        }));
      setPerformanceData(trend);

    } catch (error) {
      console.error('Error loading campaign reports:', error);
      toast.error('Failed to load campaign reports');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Reports</h1>
          <p className="text-muted-foreground mt-2">
            Detailed performance analytics for all campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadReports} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => {
            // Export all campaign data as CSV
            if (campaigns.length === 0) { toast.error('No data to export'); return; }
            const headers = ['Name','Type','Sent','Delivered','Opened','Clicked','Bounced','Unsubscribed','Revenue'];
            const rows = campaigns.map(c => [c.name, c.type, c.sent, c.delivered, c.opened, c.clicked, c.bounced, c.unsubscribed, c.revenue].join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `campaign-reports-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('Report exported successfully');
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
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
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Campaign opens</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {campaigns.length} campaigns</p>
          </CardContent>
        </Card>
      </div>

      {stats.totalSent === 0 && !isLoading && (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaign data yet</h3>
            <p className="text-muted-foreground max-w-md">
              Send your first campaign to see performance metrics, delivery rates, and engagement analytics here.
            </p>
          </CardContent>
        </Card>
      )}

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
                  <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
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
                      {campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  {/* Opened */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Opened</p>
                    <p className="text-2xl font-bold">{campaign.opened.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">
                      {campaign.delivered > 0 ? ((campaign.opened / campaign.delivered) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  {/* Clicked */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clicked</p>
                    <p className="text-2xl font-bold">{campaign.clicked.toLocaleString()}</p>
                    <p className="text-xs text-purple-600">
                      {campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  {/* Bounced */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bounced</p>
                    <p className="text-lg font-semibold">{campaign.bounced}</p>
                    <p className="text-xs text-red-600">
                      {campaign.sent > 0 ? ((campaign.bounced / campaign.sent) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  {/* Unsubscribed */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unsubscribed</p>
                    <p className="text-lg font-semibold">{campaign.unsubscribed}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.sent > 0 ? ((campaign.unsubscribed / campaign.sent) * 100).toFixed(2) : '0.00'}%
                    </p>
                  </div>

                  {/* Revenue */}
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Revenue Generated</p>
                    <p className="text-lg font-semibold">
                      ${campaign.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600">
                      ROI: {(campaign.spent || 0) > 0 && campaign.revenue > 0 ? `${((campaign.revenue / campaign.spent) * 100).toFixed(0)}%` : campaign.revenue > 0 ? 'Positive' : 'N/A'}
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
            {(() => {
              const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
              const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered, 0);
              const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0);
              const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked, 0);
              const totalConverted = campaigns.reduce((sum, c) => sum + (c.converted || c.conversions || 0), 0);

              return [
                { 
                  stage: 'Sent', 
                  count: totalSent, 
                  percentage: 100, 
                  color: 'bg-blue-500' 
                },
                { 
                  stage: 'Delivered', 
                  count: totalDelivered, 
                  percentage: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0, 
                  color: 'bg-green-500' 
                },
                { 
                  stage: 'Opened', 
                  count: totalOpened, 
                  percentage: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0, 
                  color: 'bg-orange-500' 
                },
                { 
                  stage: 'Clicked', 
                  count: totalClicked, 
                  percentage: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0, 
                  color: 'bg-purple-500' 
                },
                { 
                  stage: 'Converted', 
                  count: totalConverted, 
                  percentage: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0, 
                  color: 'bg-pink-500' 
                },
              ].map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${stage.color}`}></div>
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${stage.color}`}
                      style={{ width: `${Math.min(stage.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ));
            })()}
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
              {campaigns
                .sort((a, b) => (b.delivered > 0 ? b.opened / b.delivered : 0) - (a.delivered > 0 ? a.opened / a.delivered : 0))
                .slice(0, 3)
                .map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {item.type}
                      </Badge>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {item.delivered > 0 ? ((item.opened / item.delivered) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              {campaigns.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No campaigns found</p>
              )}
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
              {campaigns
                .sort((a, b) => (b.opened > 0 ? b.clicked / b.opened : 0) - (a.opened > 0 ? a.clicked / a.opened : 0))
                .slice(0, 3)
                .map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {item.type}
                      </Badge>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {item.opened > 0 ? ((item.clicked / item.opened) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              {campaigns.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No campaigns found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignReports;
