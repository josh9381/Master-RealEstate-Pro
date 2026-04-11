import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, DollarSign, Mail, ClipboardCheck, Target, ArrowRightLeft, Activity, FileBarChart, ChevronRight, Gauge, Crosshair, PiggyBank, PhoneForwarded, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { calcRate, formatRate } from '@/lib/metricsCalculator';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { CHART_COLORS } from '@/lib/chartColors';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { DateRangePicker, DateRange } from '@/components/shared/DateRangePicker';
import { computeDateRange } from '@/components/shared/dateRangeUtils';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

const AnalyticsDashboard = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const { data: analyticsResult, isLoading: loading, isError: analyticsError, error: analyticsErrorObj, refetch } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const [dashboard, leads, campaigns, teamPerf, revTimeline] = await Promise.all([
        analyticsApi.getDashboardStats(params),
        analyticsApi.getLeadAnalytics(params),
        analyticsApi.getCampaignAnalytics(params),
        analyticsApi.getTeamPerformance(params),
        analyticsApi.getRevenueTimeline({ months: 12 })
      ]);
      return {
        dashboardData: dashboard.data,
        leadAnalytics: leads.data,
        campaignAnalytics: campaigns.data,
        teamPerformanceData: teamPerf?.data || [],
        revenueTimeline: revTimeline?.data?.monthly || [],
      };
    },
  });

  const dashboardData = analyticsResult?.dashboardData ?? null;
  const leadAnalytics = analyticsResult?.leadAnalytics ?? null;
  const campaignAnalytics = analyticsResult?.campaignAnalytics ?? null;
  const teamPerformanceData = analyticsResult?.teamPerformanceData ?? [];
  const revenueTimeline = useMemo(() => analyticsResult?.revenueTimeline ?? [], [analyticsResult?.revenueTimeline]);

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  // Revenue data from revenue timeline endpoint
  const revenueData = useMemo(() => revenueTimeline.map((m: { month: string; totalRevenue?: number }) => ({
    month: m.month,
    revenue: m.totalRevenue || 0,
  })), [revenueTimeline]);
  // Single source of truth: revenue timeline aggregation. Campaign performance total is only
  // used when no timeline data is available (e.g. brand-new org with no monthly history).
  const totalRevenue = revenueTimeline.length > 0
    ? revenueTimeline.reduce((sum: number, m: { totalRevenue?: number }) => sum + (m.totalRevenue || 0), 0)
    : (campaignAnalytics?.performance?.totalRevenue || 0);
  const totalLeads = dashboardData?.leads?.total || leadAnalytics?.total || 0;
  const conversionRate = leadAnalytics?.conversionRate || dashboardData?.leads?.conversionRate || 0;
  const wonLeads = leadAnalytics?.byStatus?.WON || 0;
  const avgDealSize = wonLeads > 0 ? totalRevenue / wonLeads : 0;
  const pipelineLeads = (leadAnalytics?.byStatus?.QUALIFIED || 0) + (leadAnalytics?.byStatus?.CONTACTED || 0) + (leadAnalytics?.byStatus?.NEGOTIATION || 0) + (leadAnalytics?.byStatus?.PROPOSAL || 0);
  const pipelineValue = leadAnalytics?.pipelineValue ?? (avgDealSize > 0 ? pipelineLeads * avgDealSize : 0);

  // Channel data from lead sources
  const channelData = useMemo(() => leadAnalytics?.bySource 
    ? Object.entries(leadAnalytics.bySource).map(([name, value]: [string, unknown], index) => ({
        name,
        value: calcRate(Number(value) || 0, totalLeads),
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
    : [], [leadAnalytics?.bySource, totalLeads]);

  // Conversion funnel from lead status data
  const conversionFunnel = leadAnalytics?.byStatus
    ? [
        { stage: 'Total Leads', count: totalLeads },
        { stage: 'New', count: leadAnalytics.byStatus.NEW || 0 },
        { stage: 'Qualified', count: leadAnalytics.byStatus.QUALIFIED || 0 },
        { stage: 'Proposal', count: leadAnalytics.byStatus.PROPOSAL || 0 },
        { stage: 'Won', count: leadAnalytics.byStatus.WON || 0 },
      ]
    : [];

  const teamPerformance = teamPerformanceData || [];

  // Campaign performance metrics
  const emailOpenRate = campaignAnalytics?.performance?.openRate || 0;
  const emailClickRate = campaignAnalytics?.performance?.clickRate || 0;
  const emailConversionRate = campaignAnalytics?.performance?.conversionRate || 0;

  if (loading) {
    return <LoadingSkeleton rows={3} showChart />;
  }

  if (analyticsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold leading-tight">Analytics Dashboard</h1>
        <ErrorBanner
          message={analyticsErrorObj instanceof Error ? analyticsErrorObj.message : 'Failed to load analytics data'}
          retry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── Header + KPIs ───────────────────────────────────── */}
      <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Comprehensive view of your business performance"
        actions={
          <div className="flex items-center space-x-2">
            <DateRangePicker onChange={handleDateChange} />
            <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/campaigns" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Total Revenue
                <HelpTooltip text="Sum of all deal values from won leads plus campaign revenue. This reflects recognized revenue within the selected date range." />
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground">
                {campaignAnalytics?.total || 0} campaigns
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/leads" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Total Leads
                <HelpTooltip text="Total number of leads in your CRM for the selected period." />
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {leadAnalytics?.byStatus?.NEW || 0} new this period
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/analytics/leads" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Conversion Rate
                <HelpTooltip text="Percentage of leads that reached 'Won' status. Higher is better — aim for 15–25% with qualified leads." />
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRate(conversionRate)}%</div>
              <p className="text-xs text-muted-foreground">
                {leadAnalytics?.byStatus?.WON || 0} won deals
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/analytics/leads" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Avg Deal Size
                <HelpTooltip text="Average value of won deals. Calculated by dividing total revenue by the number of won leads." />
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgDealSize.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              <p className="text-xs text-muted-foreground">
                {leadAnalytics?.averageScore || 0} avg score
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Page-level empty state when no data exists */}
      {totalLeads === 0 && totalRevenue === 0 && (
        <AnalyticsEmptyState variant="general" />
      )}
      </div>

      {/* ── Charts & Funnel ─────────────────────────────────── */}
      <div className="space-y-6">
      {/* Revenue & Conversion Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
            <ChartErrorBoundary chartName="Revenue Trend">
            <div role="img" aria-label="Revenue trend chart">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Distribution by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
            <ChartErrorBoundary chartName="Lead Sources">
            <div role="img" aria-label="Lead sources distribution pie chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill={CHART_COLORS[0]}
                  dataKey="value"
                >
                  {channelData.map((entry, i) => (
                    <Cell key={`cell-${i}-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No lead source data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead progression through sales stages</CardDescription>
        </CardHeader>
        <CardContent>
          {conversionFunnel.length > 0 ? (
          <ChartErrorBoundary chartName="Conversion Funnel">
          <div role="img" aria-label="Conversion funnel chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
          </div>
          </ChartErrorBoundary>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No conversion data yet
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* ── Team + Stats ────────────────────────────────────── */}
      <div className="space-y-6">
      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Top performers this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamPerformance.length > 0 ? teamPerformance.map((member: { name: string; deals: number; revenue?: number; leads?: number; [k: string]: unknown }, idx: number) => (
              <div key={`member-${member.name}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="font-semibold text-lg text-muted-foreground w-6">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.deals} deals closed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${((member.revenue ?? 0) / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-muted-foreground">revenue</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No team performance data yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/analytics/conversions" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Open Rate</span>
                  <span className="font-semibold">{formatRate(emailOpenRate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Click Rate</span>
                  <span className="font-semibold">{formatRate(emailClickRate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Conversion Rate</span>
                  <span className="font-semibold">{formatRate(emailConversionRate)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Task Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Tasks</span>
                <span className="font-semibold">{dashboardData?.tasks?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-semibold">{dashboardData?.tasks?.completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completion Rate</span>
                <span className="font-semibold">{formatRate(dashboardData?.tasks?.completionRate || 0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link to="/leads/pipeline" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Pipeline Health
              <HelpTooltip text="Open Opportunities = leads at Qualified, Contacted, Negotiation, and Proposal stages. Pipeline Value = total estimated value of all deals in progress. A healthy pipeline should have 3–5x your revenue target in open opportunities." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Open Opportunities</span>
                <span className="font-semibold">{pipelineLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pipeline Value</span>
                <span className="font-semibold">${pipelineValue > 0 ? `${(pipelineValue / 1000000).toFixed(1)}M` : '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Forecast</span>
                <span className="font-semibold text-muted-foreground">—</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </Link>
      </div>
      </div>

      {/* ── Explore Navigation ───────────────────────────────── */}
      {/* Explore More Analytics */}
      <div>
        <h2 className="text-lg font-semibold leading-tight mb-4">Explore More Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/analytics/conversions', icon: ArrowRightLeft, bgClass: 'bg-success/10', textClass: 'text-success', title: 'Conversion Reports', desc: 'Funnel analysis, conversion rates & drop-off points' },
            { to: '/analytics/usage', icon: Activity, bgClass: 'bg-primary/10', textClass: 'text-primary', title: 'Usage Analytics', desc: 'Platform usage, feature adoption & user activity' },
            { to: '/analytics/custom-reports', icon: FileBarChart, bgClass: 'bg-warning/10', textClass: 'text-warning', title: 'Custom Reports', desc: 'Build & save custom reports tailored to your needs' },
            { to: '/analytics/attribution', icon: Crosshair, bgClass: 'bg-info/10', textClass: 'text-info', title: 'Attribution Report', desc: 'Multi-touch attribution & channel performance' },
            { to: '/analytics/velocity', icon: Gauge, bgClass: 'bg-warning/10', textClass: 'text-warning', title: 'Lead Velocity', desc: 'Pipeline speed, stage durations & bottlenecks' },
            { to: '/analytics/source-roi', icon: PiggyBank, bgClass: 'bg-success/10', textClass: 'text-success', title: 'Source ROI', desc: 'Revenue efficiency per lead source' },
            { to: '/analytics/goals', icon: Target, bgClass: 'bg-primary/10', textClass: 'text-primary', title: 'Goal Tracking', desc: 'Set, track & measure your business goals' },
            { to: '/analytics/follow-ups', icon: PhoneForwarded, bgClass: 'bg-info/10', textClass: 'text-info', title: 'Follow-Up Analytics', desc: 'Completion rates, channels & response trends' },
            { to: '/analytics/comparison', icon: CalendarRange, bgClass: 'bg-info/10', textClass: 'text-info', title: 'Period Comparison', desc: 'Compare metrics across different time periods' },
          ].map(({ to, icon: Icon, bgClass, textClass, title, desc }) => (
            <Link key={to} to={to} className="block">
              <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 ${bgClass} rounded-lg`}>
                      <Icon className={`h-6 w-6 ${textClass}`} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mt-3">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
