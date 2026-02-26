import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Send, Eye, MousePointer, Users, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { analyticsApi } from '@/lib/api';
import { exportToCSV, campaignExportColumns } from '@/lib/exportService';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

const CampaignAnalytics = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const navigate = useNavigate();

  const { data: campaignData = null, isLoading: loading, isError: campaignError, error: campaignErrorObj, refetch } = useQuery({
    queryKey: ['campaign-analytics'],
    queryFn: async () => {
      const [campaignResponse, monthlyResponse, hourlyResponse] = await Promise.all([
        analyticsApi.getCampaignAnalytics(dateRangeRef.current),
        analyticsApi.getMonthlyPerformance({ months: 12 }),
        analyticsApi.getHourlyEngagement({ days: 90 }),
      ]);
      
      // Merge monthly and hourly data into the campaign data object
      return {
        ...(campaignResponse.data || {}),
        dailyStats: monthlyResponse.data || [],
        hourlyStats: hourlyResponse.data?.hourly || [],
      };
    },
  });

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (campaignError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Campaign Analytics</h1>
        <ErrorBanner
          message={campaignErrorObj instanceof Error ? campaignErrorObj.message : 'Failed to load campaign analytics'}
          retry={() => refetch()}
        />
      </div>
    );
  }

  // Use API data with fallbacks
  const performance = campaignData?.performance || {};
  const totalCampaigns = campaignData?.total || 0;
  const topCampaigns = campaignData?.topCampaigns || [];

  // Campaign performance trend from API (monthly data)
  const campaignPerformance = (campaignData?.dailyStats || []).map((d: any) => ({
    date: d.month || d.date,
    sent: d.sent || 0,
    opened: d.opened || 0,
    clicked: d.clicked || 0,
    converted: d.converted || 0,
  }));

  // Hourly performance from API
  const hourlyPerformance = (campaignData?.hourlyStats || []).map((h: any) => ({
    hour: h.label || h.hour,
    openRate: h.opens || h.openRate || 0,
    clicks: h.clicks || 0,
  }));

  // Use topCampaigns from API or fallback to empty array
  const campaigns = topCampaigns.length > 0 ? topCampaigns : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your marketing campaign performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => {
            if (campaigns.length > 0) {
              exportToCSV(campaigns, campaignExportColumns, { filename: `campaign-analytics-${new Date().toISOString().split('T')[0]}` });
            }
          }}>Export Data</Button>
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
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Open Rate
              <HelpTooltip text="Percentage of delivered emails that were opened. Industry average is 20–25% for real estate. Improve by writing better subject lines and sending at optimal times." />
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.openRate || 0}%</div>
            <p className="text-xs text-muted-foreground">{(performance.totalOpened || 0).toLocaleString()} opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Click Rate
              <HelpTooltip text="Percentage of opened emails where a link was clicked. A good click rate is 2–5%. Improve by adding clear calls-to-action and relevant content." />
            </CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.clickRate || 0}%</div>
            {/* Comparison hidden until real period-over-period data is available */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">From campaign data</p>
          </CardContent>
        </Card>
      </div>

      {/* Page-level empty state when no campaigns exist */}
      {totalCampaigns === 0 && (
        <AnalyticsEmptyState variant="campaigns" />
      )}

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
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No campaign performance data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Comparison */}
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
              {campaigns.map((campaign: any) => {
                const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : '0.0';
                const clickRate = campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : '0.0';
                const convRate = campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(1) : '0.0';

                return (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>{(campaign.sent || 0).toLocaleString()}</TableCell>
                    <TableCell>{openRate}%</TableCell>
                    <TableCell>{clickRate}%</TableCell>
                    <TableCell>{convRate}%</TableCell>
                    <TableCell>${(campaign.revenue || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="success">{campaign.roi || 0}%</Badge>
                    </TableCell>
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
                <CartesianGrid strokeDasharray="3 3" />
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
              {topCampaigns.length > 0 ? topCampaigns.slice(0, 4).map((campaign: any, index: number) => (
                <div key={index} className="space-y-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{campaign.name || campaign.subject || 'Campaign'}</p>
                    <Badge variant="outline">{campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Open: {campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%</span>
                    <span>Click: {campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              )) : (
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
};

export default CampaignAnalytics;
