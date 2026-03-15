import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Mail, MousePointer, RefreshCw, Download, Send, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { campaignsApi, analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { exportToCSV, campaignExportColumns } from '@/lib/exportService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { EnrichedCampaign } from '@/types';
import {
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

const TYPE_DISPLAY: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PHONE: 'Phone',
  SOCIAL: 'Social',
};

// ─── Overview Tab (from CampaignAnalytics) ────────────────────────────────────

function OverviewTab() {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const navigate = useNavigate();

  const { data: campaignData = null, isLoading: loading, isError: campaignError, error: campaignErrorObj, refetch } = useQuery({
    queryKey: ['campaign-analytics'],
    queryFn: async () => {
      const [campaignResult, monthlyResult, hourlyResult] = await Promise.allSettled([
        analyticsApi.getCampaignAnalytics(dateRangeRef.current),
        analyticsApi.getMonthlyPerformance({ months: 12 }),
        analyticsApi.getHourlyEngagement({ days: 90 }),
      ]);
      const campaignResponse = campaignResult.status === 'fulfilled' ? campaignResult.value : null;
      const monthlyResponse = monthlyResult.status === 'fulfilled' ? monthlyResult.value : null;
      const hourlyResponse = hourlyResult.status === 'fulfilled' ? hourlyResult.value : null;
      return {
        ...(campaignResponse?.data || {}),
        dailyStats: monthlyResponse?.data || [],
        hourlyStats: hourlyResponse?.data?.hourly || [],
      };
    },
  });

  // Fetch all campaigns only as fallback when analytics has no topCampaigns
  const { data: allCampaignsData } = useQuery({
    queryKey: ['campaigns-for-reports'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({});
      return response.data?.campaigns || [];
    },
    enabled: !loading && (!campaignData?.topCampaigns || campaignData.topCampaigns.length === 0),
  });

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  if (loading) {
    return <LoadingSkeleton rows={4} showChart />;
  }

  if (campaignError) {
    return (
      <ErrorBanner
        message={campaignErrorObj instanceof Error ? campaignErrorObj.message : 'Failed to load campaign analytics'}
        retry={() => refetch()}
      />
    );
  }

  const performance = campaignData?.performance || {};
  const totalCampaigns = campaignData?.total ?? 0;
  const topCampaigns = campaignData?.topCampaigns || [];
  const campaigns = topCampaigns.length > 0 ? topCampaigns : (allCampaignsData || topCampaigns);

  const campaignPerformance = (campaignData?.dailyStats || []).map((d: Record<string, unknown>) => ({
    date: (d.month as string) || (d.date as string),
    sent: (d.sent as number) ?? 0,
    opened: (d.opened as number) ?? 0,
    clicked: (d.clicked as number) ?? 0,
    converted: (d.converted as number) ?? 0,
  }));

  const hourlyPerformance = (campaignData?.hourlyStats || []).map((h: Record<string, unknown>) => {
    const rawRate = (h.opens as number) ?? (h.openRate as number) ?? 0;
    return {
      hour: (h.label as string) || (h.hour as string),
      openRate: rawRate < 1 ? rawRate * 100 : rawRate,
      clicks: (h.clicks as number) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <DateRangePicker onChange={handleDateChange} />
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => {
          if (campaigns.length > 0) {
            exportToCSV(campaigns, campaignExportColumns, { filename: `campaign-analytics-${new Date().toISOString().split('T')[0]}` });
          }
        }}>Export Data</Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performance.totalSent ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totalCampaigns} campaigns</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Open Rate
              <HelpTooltip text="Percentage of delivered emails that were opened. Industry average is 20–25% for real estate." />
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.openRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">{(performance.totalOpened ?? 0).toLocaleString()} opened</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Click Rate
              <HelpTooltip text="Percentage of opened emails where a link was clicked. A good click rate is 2–5%." />
            </CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.clickRate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.conversionRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">From campaign data</p>
          </CardContent>
        </Card>
      </div>

      {totalCampaigns === 0 && <AnalyticsEmptyState variant="campaigns" />}

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Trend</CardTitle>
          <CardDescription>Sent, opened, clicked, and converted over time</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
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
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No campaign performance data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Comparison</CardTitle>
          <CardDescription>Performance metrics for all campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
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
                {campaigns.map((campaign: Record<string, unknown>) => {
                  const sent = (campaign.sent as number) ?? 0;
                  const opened = (campaign.opened as number) ?? 0;
                  const clicked = (campaign.clicked as number) ?? 0;
                  const converted = (campaign.converted as number) ?? 0;
                  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
                  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0.0';
                  const convRate = sent > 0 ? ((converted / sent) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={campaign.id as string} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      <TableCell className="font-medium">{campaign.name as string}</TableCell>
                      <TableCell><Badge variant="outline">{campaign.type as string}</Badge></TableCell>
                      <TableCell>{sent.toLocaleString()}</TableCell>
                      <TableCell>{openRate}%</TableCell>
                      <TableCell>{clickRate}%</TableCell>
                      <TableCell>{convRate}%</TableCell>
                      <TableCell>${((campaign.revenue as number) ?? 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="success">{(campaign.roi as number) ?? 0}%</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No campaign data yet
            </div>
          )}
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
            {hourlyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="openRate" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hourly data yet
              </div>
            )}
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
              {topCampaigns.length > 0 ? topCampaigns.slice(0, 4).map((campaign: Record<string, unknown>, index: number) => {
                const sent = (campaign.sent as number) ?? 0;
                const opened = (campaign.opened as number) ?? 0;
                const clicked = (campaign.clicked as number) ?? 0;
                return (
                <div key={index} className="space-y-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{(campaign.name as string) || (campaign.subject as string) || 'Campaign'}</p>
                    <Badge variant="outline">{sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0}%</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Open: {sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0}%</span>
                    <span>Click: {sent > 0 ? ((clicked / sent) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              );
              }) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No campaign content data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Detailed Reports Tab (from CampaignReports) ────────────────────────────

function DetailedReportsTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  const { data: reportData, isFetching: isLoading, refetch: loadReports } = useQuery({
    queryKey: ['campaignReports'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns();
      const allCampaigns = response.data?.campaigns || response.campaigns || [];

      const enrichedCampaigns: EnrichedCampaign[] = allCampaigns.map((c: Record<string, unknown>) => {
        const sent = (c.recipientCount as number) ?? (c.sent as number) ?? 0;
        const delivered = (c.delivered as number) ?? 0;
        const opened = (c.opens as number) ?? (c.opened as number) ?? 0;
        const clicked = (c.clicks as number) ?? (c.clicked as number) ?? 0;
        const bounced = (c.bounced as number) ?? 0;
        const unsubscribed = (c.unsubscribed as number) ?? 0;
        const revenue = (c.revenue as number) ?? 0;
        return {
          ...c,
          id: c.id as string,
          name: c.name as string,
          type: TYPE_DISPLAY[((c.type as string) || '').toUpperCase()] || (c.type as string) || 'Unknown',
          sent, delivered, opened, clicked, bounced, unsubscribed, revenue,
        };
      });

      const totalSent = enrichedCampaigns.reduce((sum: number, c) => sum + c.sent, 0);
      const totalDelivered = enrichedCampaigns.reduce((sum: number, c) => sum + c.delivered, 0);
      const totalOpened = enrichedCampaigns.reduce((sum: number, c) => sum + c.opened, 0);
      const totalClicked = enrichedCampaigns.reduce((sum: number, c) => sum + c.clicked, 0);
      const totalRevenue = enrichedCampaigns.reduce((sum: number, c) => sum + c.revenue, 0);

      const trend = [...enrichedCampaigns]
        .filter((c) => c.sent > 0)
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
        .map((c) => ({
          date: new Date(c.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sent: c.sent, delivered: c.delivered, opened: c.opened, clicked: c.clicked,
        }));

      return {
        campaigns: enrichedCampaigns,
        stats: {
          totalSent,
          deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
          openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
          clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
          revenue: totalRevenue,
        },
        performanceData: trend,
      };
    },
  });
  const campaigns = reportData?.campaigns ?? [];
  const stats = reportData?.stats ?? { totalSent: 0, deliveryRate: 0, openRate: 0, clickRate: 0, revenue: 0 };
  const performanceData = reportData?.performanceData ?? [];

  if (isLoading) {
    return <LoadingSkeleton rows={5} showChart />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={() => loadReports()} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (campaigns.length === 0) { toast.error('No data to export'); return; }
          exportToCSV(campaigns, campaignExportColumns, {
            filename: `campaign-reports-${new Date().toISOString().split('T')[0]}`,
          });
          toast.success('Report exported successfully');
        }}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Campaign opens</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {campaigns.length} campaigns</p>
          </CardContent>
        </Card>
      </div>

      {stats.totalSent === 0 && (
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
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
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

      {/* Campaign Detail Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Details</CardTitle>
          <CardDescription>Individual campaign metrics and results ({campaigns.length} campaigns)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(showAllCampaigns ? campaigns : campaigns.slice(0, 5)).map((campaign) => (
              <div key={campaign.id} className="p-4 border rounded-lg hover:shadow-md hover:border-primary/30 transition-all duration-200">
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
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sent</p>
                    <p className="text-2xl font-bold">{(campaign.sent ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Delivered</p>
                    <p className="text-2xl font-bold">{(campaign.delivered ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-green-600">
                      {campaign.sent > 0 ? (((campaign.delivered ?? 0) / campaign.sent) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Opened</p>
                    <p className="text-2xl font-bold">{(campaign.opened ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-600">
                      {(campaign.delivered ?? 0) > 0 ? (((campaign.opened ?? 0) / campaign.delivered) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clicked</p>
                    <p className="text-2xl font-bold">{(campaign.clicked ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-purple-600">
                      {(campaign.opened ?? 0) > 0 ? (((campaign.clicked ?? 0) / campaign.opened) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bounced</p>
                    <p className="text-lg font-semibold">{campaign.bounced ?? 0}</p>
                    <p className="text-xs text-red-600">
                      {campaign.sent > 0 ? (((campaign.bounced ?? 0) / campaign.sent) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unsubscribed</p>
                    <p className="text-lg font-semibold">{campaign.unsubscribed ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.sent > 0 ? (((campaign.unsubscribed ?? 0) / campaign.sent) * 100).toFixed(2) : '0.00'}%
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Revenue Generated</p>
                    <p className="text-lg font-semibold">${(campaign.revenue ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {campaigns.length > 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAllCampaigns(!showAllCampaigns)}
              >
                {showAllCampaigns ? `Show less` : `Show all ${campaigns.length} campaigns`}
              </Button>
            )}
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
              const totalSent = campaigns.reduce((sum, c) => sum + (c.sent ?? 0), 0);
              const totalDelivered = campaigns.reduce((sum, c) => sum + (c.delivered ?? 0), 0);
              const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened ?? 0), 0);
              const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked ?? 0), 0);
              const totalConverted = campaigns.reduce((sum, c) => sum + ((c.converted ?? c.conversions ?? 0) as number), 0);
              return [
                { stage: 'Sent', count: totalSent, percentage: 100, color: 'bg-blue-500' },
                { stage: 'Delivered', count: totalDelivered, percentage: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0, color: 'bg-green-500' },
                { stage: 'Opened', count: totalOpened, percentage: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0, color: 'bg-orange-500' },
                { stage: 'Clicked', count: totalClicked, percentage: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0, color: 'bg-purple-500' },
                { stage: 'Converted', count: totalConverted, percentage: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0, color: 'bg-pink-500' },
              ].map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-4">
                    <div className={`h-4 rounded-full ${stage.color}`} style={{ width: `${Math.max(stage.count > 0 ? Math.min(stage.percentage, 100) : 0, stage.count > 0 ? 2 : 0)}%` }} />
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
            <CardTitle className="flex items-center gap-2">
              Best Open Rate
              <span className="inline-block h-3 w-3 rounded-full bg-green-600" title="Open rate indicator" />
            </CardTitle>
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
                      <Badge variant="secondary" className="mt-1">{item.type}</Badge>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {item.delivered > 0 ? ((item.opened / item.delivered) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              {campaigns.length === 0 && <p className="text-center text-muted-foreground py-4">No campaigns found</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Best Click Rate
              <span className="inline-block h-3 w-3 rounded-full bg-purple-600" title="Click rate indicator" />
            </CardTitle>
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
                      <Badge variant="secondary" className="mt-1">{item.type}</Badge>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {item.opened > 0 ? ((item.clicked / item.opened) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              {campaigns.length === 0 && <p className="text-center text-muted-foreground py-4">No campaigns found</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page (Tabbed) ─────────────────────────────────────────────────────

const CampaignReports = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');

  return (
    <div className="space-y-6">
      <CampaignsSubNav />

      <div>
        <h1 className="text-3xl font-bold">Campaign Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track performance, analyze trends, and explore detailed campaign metrics
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('detailed')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'detailed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Detailed Reports
        </button>
      </div>

      {activeTab === 'overview' ? <OverviewTab /> : <DetailedReportsTab />}
    </div>
  );
};

export default CampaignReports;
