import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Mail,
  MousePointer,
  RefreshCw,
  Eye,
  DollarSign,
  Send,
  MessageSquare,
  Phone,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { campaignsApi } from '@/lib/api';
import { LINE_CHART_COLORS, CHART_COLORS } from '@/lib/chartColors';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { DateRangePicker, DateRange, DateRangePreset } from '@/components/shared/DateRangePicker';
import { computeDateRange } from '@/components/shared/dateRangeUtils';
import {
  calcOpenRate,
  calcClickRate,
  calcConversionRate,
  calcDeliveryRate,
  calcROI,
  formatRate,
  fmtMoney,
} from '@/lib/metricsCalculator';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { EnrichedCampaign } from '@/types';

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: CHART_COLORS[0],
  SMS: CHART_COLORS[2],
  PHONE: CHART_COLORS[1],
  SOCIAL: CHART_COLORS[7],
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PHONE: 'Phone',
  SOCIAL: 'Social',
};

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  PHONE: Phone,
  SOCIAL: Share2,
};

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value: string;
  subtitle: string;
}

function MetricCard({ title, icon: Icon, value, subtitle }: MetricCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function CampaignAnalytics() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [, setDateRange] = useState<DateRange>(() => computeDateRange('30d'));

  const handleDateChange = (range: DateRange, preset: DateRangePreset) => {
    setDateRange(range);
    setDatePreset(preset);
  };

  // Fetch all campaigns for analytics
  const {
    data: campaignsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaigns-analytics-all'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ limit: 500 });
      return (response.data?.campaigns || response.data || []) as EnrichedCampaign[];
    },
  });

  const campaigns = useMemo(() => campaignsData || [], [campaignsData]);

  // Aggregate metrics from campaign data
  const metrics = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        totalSent: acc.totalSent + (c.sent || 0),
        totalDelivered: acc.totalDelivered + (c.delivered || 0),
        totalOpened: acc.totalOpened + (c.opened || c.opens || 0),
        totalClicked: acc.totalClicked + (c.clicked || c.clicks || 0),
        totalConverted: acc.totalConverted + (c.converted || c.conversions || 0),
        totalRevenue: acc.totalRevenue + (c.revenue || 0),
        totalSpent: acc.totalSpent + (c.spent || 0),
      }),
      { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalConverted: 0, totalRevenue: 0, totalSpent: 0 }
    );
  }, [campaigns]);

  // Channel breakdown for pie chart
  const channelBreakdown = useMemo(() => {
    const byType: Record<string, number> = {};
    campaigns.forEach((c) => {
      const type = (c.type || 'EMAIL').toUpperCase();
      byType[type] = (byType[type] || 0) + 1;
    });
    return Object.entries(byType).map(([type, count]) => ({
      name: CHANNEL_LABELS[type] || type,
      value: count,
      color: CHANNEL_COLORS[type] || CHART_COLORS[6],
    }));
  }, [campaigns]);

  // Channel performance for bar chart
  const channelPerformance = useMemo(() => {
    const byType: Record<string, { sent: number; opened: number; clicked: number; converted: number }> = {};
    campaigns.forEach((c) => {
      const type = (c.type || 'EMAIL').toUpperCase();
      if (!byType[type]) byType[type] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
      byType[type].sent += c.sent || 0;
      byType[type].opened += c.opened || c.opens || 0;
      byType[type].clicked += c.clicked || c.clicks || 0;
      byType[type].converted += c.converted || c.conversions || 0;
    });
    return Object.entries(byType).map(([type, data]) => ({
      channel: CHANNEL_LABELS[type] || type,
      ...data,
      openRate: data.sent > 0 ? Number(((data.opened / data.sent) * 100).toFixed(1)) : 0,
      clickRate: data.sent > 0 ? Number(((data.clicked / data.sent) * 100).toFixed(1)) : 0,
    }));
  }, [campaigns]);

  // Performance by type — revenue and campaign counts
  const performanceByType = useMemo(() => {
    const types = ['EMAIL', 'SMS', 'PHONE', 'SOCIAL'];
    return types.map(type => {
      const typeCampaigns = campaigns.filter(c => (c.type || '').toUpperCase() === type);
      const revenue = typeCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
      return {
        type: CHANNEL_LABELS[type] || type,
        campaigns: typeCampaigns.length,
        revenue,
      };
    });
  }, [campaigns]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const byStatus: Record<string, number> = {};
    campaigns.forEach((c) => {
      const status = c.status || 'DRAFT';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    return byStatus;
  }, [campaigns]);

  const activeCampaigns = (statusBreakdown['ACTIVE'] || 0) + (statusBreakdown['SENDING'] || 0);
  const completedCampaigns = (statusBreakdown['COMPLETED'] || 0) + (statusBreakdown['SENT'] || 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} showChart />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load analytics'}
          retry={() => refetch()}
        />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <AnalyticsEmptyState
          variant="campaigns"
          title="No Campaign Data Yet"
          description="Create and send your first campaign to see analytics here."
        />
      </div>
    );
  }

  const openRate = calcOpenRate(metrics.totalOpened, metrics.totalSent);
  const clickRate = calcClickRate(metrics.totalClicked, metrics.totalSent);
  const conversionRate = calcConversionRate(metrics.totalConverted, metrics.totalSent);
  const deliveryRate = calcDeliveryRate(metrics.totalDelivered, metrics.totalSent);
  const roi = calcROI(metrics.totalRevenue, metrics.totalSpent);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">Campaign Analytics</h1>
          <p className="text-muted-foreground">
            Real-time performance overview across all campaign channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={datePreset} onChange={handleDateChange} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sent"
          icon={Send}
          value={metrics.totalSent.toLocaleString()}
          subtitle={`${campaigns.length} campaigns`}
        />
        <MetricCard
          title="Open Rate"
          icon={Eye}
          value={formatRate(openRate)}
          subtitle={`${metrics.totalOpened.toLocaleString()} opens`}
        />
        <MetricCard
          title="Click Rate"
          icon={MousePointer}
          value={formatRate(clickRate)}
          subtitle={`${metrics.totalClicked.toLocaleString()} clicks`}
        />
        <MetricCard
          title="Conversions"
          icon={TrendingUp}
          value={metrics.totalConverted.toLocaleString()}
          subtitle={`${formatRate(conversionRate)} conversion rate`}
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Delivery Rate"
          icon={Mail}
          value={formatRate(deliveryRate)}
          subtitle={`${metrics.totalDelivered.toLocaleString()} delivered`}
        />
        <MetricCard
          title="Revenue"
          icon={DollarSign}
          value={fmtMoney(metrics.totalRevenue)}
          subtitle={`${fmtMoney(metrics.totalSpent)} spent`}
        />
        <MetricCard
          title="ROI"
          icon={TrendingUp}
          value={`${roi.toFixed(1)}%`}
          subtitle="Return on investment"
        />
        <MetricCard
          title="Active Campaigns"
          icon={Users}
          value={String(activeCampaigns)}
          subtitle={`${completedCampaigns} completed`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Campaigns by channel type</CardDescription>
          </CardHeader>
          <CardContent>
            {channelBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {channelBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No channel data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
            <CardDescription>Open & click rates by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {channelPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="channel" />
                  <YAxis unit="%" />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="openRate" fill={LINE_CHART_COLORS[0]} name="Open Rate" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clickRate" fill={LINE_CHART_COLORS[1]} name="Click Rate" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Performance by Type */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Campaign Type</CardTitle>
            <CardDescription>Revenue and campaign count by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceByType}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="type" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill={CHART_COLORS[0]} name="Revenue ($)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="campaigns" fill={CHART_COLORS[2]} name="# Campaigns" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Campaign Type</CardTitle>
            <CardDescription>Revenue distribution across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, revenue }) => `${type}: ${fmtMoney(revenue)}`}
                  outerRadius={100}
                  fill={CHART_COLORS[0]}
                  dataKey="revenue"
                >
                  {performanceByType.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={LINE_CHART_COLORS[index % LINE_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => fmtMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold leading-tight mb-4">Channel Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(['EMAIL', 'SMS', 'PHONE', 'SOCIAL'] as const).map((type) => {
            const Icon = CHANNEL_ICONS[type];
            const channelCampaigns = campaigns.filter(
              (c) => (c.type || 'EMAIL').toUpperCase() === type
            );
            const sent = channelCampaigns.reduce((s, c) => s + (c.sent || 0), 0);
            const opened = channelCampaigns.reduce((s, c) => s + (c.opened || c.opens || 0), 0);
            const rate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';

            return (
              <Card key={type} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${CHANNEL_COLORS[type]}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: CHANNEL_COLORS[type] }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{CHANNEL_LABELS[type]}</CardTitle>
                    <CardDescription>{channelCampaigns.length} campaigns</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">{sent.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">sent</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rate}% open rate
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CampaignAnalytics;
