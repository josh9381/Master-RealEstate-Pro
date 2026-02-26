import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, DollarSign, Mail, Phone, Target, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
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
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

const AnalyticsDashboard = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const navigate = useNavigate();

  const { data: analyticsResult, isLoading: loading, isError: analyticsError, error: analyticsErrorObj, refetch } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const [dashboard, leads, campaigns, teamPerf] = await Promise.all([
        analyticsApi.getDashboardStats(params),
        analyticsApi.getLeadAnalytics(params),
        analyticsApi.getCampaignAnalytics(params),
        analyticsApi.getTeamPerformance(params)
      ]);
      return {
        dashboardData: dashboard.data,
        leadAnalytics: leads.data,
        campaignAnalytics: campaigns.data,
        teamPerformanceData: teamPerf?.data || [],
      };
    },
  });

  const dashboardData = analyticsResult?.dashboardData ?? null;
  const leadAnalytics = analyticsResult?.leadAnalytics ?? null;
  const campaignAnalytics = analyticsResult?.campaignAnalytics ?? null;
  const teamPerformanceData = analyticsResult?.teamPerformanceData ?? [];

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  // Mock data as fallback — REMOVED: use API data only
  // Revenue data from campaign analytics
  const revenueData = campaignAnalytics?.monthlyData || [];
  const totalRevenue = campaignAnalytics?.performance?.totalRevenue || 0;
  const totalLeads = dashboardData?.leads?.total || leadAnalytics?.total || 0;
  const conversionRate = leadAnalytics?.conversionRate || dashboardData?.leads?.conversionRate || 0;
  const wonLeads = leadAnalytics?.byStatus?.WON || 0;
  const avgDealSize = wonLeads > 0 ? totalRevenue / wonLeads : 0;
  const pipelineLeads = (leadAnalytics?.byStatus?.QUALIFIED || 0) + (leadAnalytics?.byStatus?.CONTACTED || 0) + (leadAnalytics?.byStatus?.NEGOTIATION || 0) + (leadAnalytics?.byStatus?.PROPOSAL || 0);
  const pipelineValue = leadAnalytics?.pipelineValue ?? (avgDealSize > 0 ? pipelineLeads * avgDealSize : 0);

  // Channel data from lead sources
  const channelData = leadAnalytics?.bySource 
    ? Object.entries(leadAnalytics.bySource).map(([name, value]: [string, any], index) => ({
        name,
        value: totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0,
        color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][index] || '#6b7280'
      }))
    : [];

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
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <ErrorBanner
          message={analyticsErrorObj instanceof Error ? analyticsErrorObj.message : 'Failed to load analytics data'}
          retry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive view of your business performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/campaigns')}>
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leads')}>
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/analytics/leads')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Conversion Rate
              <HelpTooltip text="Percentage of leads that reached 'Won' status. Higher is better — aim for 15–25% with qualified leads." />
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {leadAnalytics?.byStatus?.WON || 0} won deals
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/analytics/leads')}>
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
      </div>

      {/* Page-level empty state when no data exists */}
      {totalLeads === 0 && totalRevenue === 0 && (
        <AnalyticsEmptyState variant="general" />
      )}

      {/* Revenue & Conversion Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue vs target</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
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
                <Area
                  type="monotone"
                  dataKey="target"
                  stackId="2"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No conversion data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Top performers this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamPerformance.length > 0 ? teamPerformance.map((member: { name: string; deals: number; revenue?: number; leads?: number; [k: string]: unknown }, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="font-semibold text-lg text-muted-foreground w-6">
                    #{index + 1}
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/analytics/campaigns')}>
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
                <span className="font-semibold">{emailOpenRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Click Rate</span>
                <span className="font-semibold">{emailClickRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-semibold">{emailConversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-4 w-4 mr-2" />
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
                <span className="font-semibold">{dashboardData?.tasks?.completionRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leads/pipeline')}>
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
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
