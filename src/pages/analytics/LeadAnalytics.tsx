import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Target, Calendar, Download, RefreshCw } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatRate, calcRate } from '@/lib/metricsCalculator';
import { useToast } from '@/hooks/useToast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { DateRangePicker, DateRange } from '@/components/shared/DateRangePicker';
import { computeDateRange } from '@/components/shared/dateRangeUtils';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';
import { CHART_COLORS } from '@/lib/chartColors';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

const LeadAnalytics = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: leadData = null, isLoading: loading, isError: leadError, error: leadErrorObj, refetch } = useQuery({
    queryKey: ['lead-analytics'],
    queryFn: async () => {
      const response = await analyticsApi.getLeadAnalytics(dateRangeRef.current);
      return response.data;
    },
  });

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  // Use API data with fallbacks
  const totalLeads = leadData?.total || 0;
  const conversionRate = leadData?.conversionRate || 0;
  const averageScore = leadData?.averageScore || 0;
  const topLeads = useMemo(() => leadData?.topLeads || [], [leadData?.topLeads]);

  // Lead trends from API data — use byStatus trends if available, otherwise show empty
  const leadTrends = leadData?.trends || [];

  // Source breakdown from API data
  const sourceBreakdown = useMemo(() => leadData?.bySource
    ? Object.entries(leadData.bySource).map(([source, count]: [string, unknown]) => ({
        source,
        count: count as number,
        percentage: calcRate((count as number), totalLeads, 0)
      }))
    : [], [leadData?.bySource, totalLeads]);

  // Top performing leads
  const topPerformers = useMemo(() => topLeads.length > 0
    ? topLeads.slice(0, 4).map((lead: { id?: string; firstName?: string; lastName?: string; status?: string; score?: number }) => ({
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        leads: 1,
        converted: lead.status === 'WON' ? 1 : 0,
        rate: `${lead.score || 0}%`,
        score: lead.score
      }))
    : [], [topLeads]);

  if (loading) {
    return <LoadingSkeleton rows={4} showChart={true} />;
  }

  if (leadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Lead Analytics</h1>
        <ErrorBanner
          message={leadErrorObj instanceof Error ? leadErrorObj.message : 'Failed to load lead analytics'}
          retry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lead Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track lead generation and conversion performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" aria-label="Export lead analytics as JSON" onClick={() => {
            const sanitizedData = {
              summary: {
                totalLeads,
                conversionRate,
                averageScore,
                qualifiedLeads: leadData?.byStatus?.QUALIFIED || 0,
                wonDeals: leadData?.byStatus?.WON || 0,
              },
              sourceBreakdown: sourceBreakdown.map(s => ({ source: s.source, count: s.count, percentage: s.percentage })),
              topPerformers: topPerformers.map((p: { name: string; score?: number; converted: number }) => ({ name: p.name, score: p.score, converted: p.converted })),
              exportedAt: new Date().toISOString(),
            };
            try {
              const blob = new Blob([JSON.stringify(sanitizedData, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `lead-analytics-${new Date().toISOString().split('T')[0]}.json`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Report exported successfully')
            } catch {
              toast.error('Failed to export report')
            }
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Total Leads
              <HelpTooltip text="Total number of leads across all statuses in the selected date range." />
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {leadData?.byStatus?.NEW || 0} new this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Conversion Rate
              <HelpTooltip text="Percentage of leads that reached 'Won' status. Calculated as (Won ÷ Total) × 100. Industry average for real estate is 2–5%; a CRM-tracked rate of 15–25% indicates strong qualification." />
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRate(conversionRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {leadData?.byStatus?.WON || 0} won deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Avg Lead Score
              <HelpTooltip text="Average quality score (0–100) across all leads. Based on engagement, profile completeness, and source quality. Higher scores indicate warmer leads ready for outreach." />
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            <p className="text-xs text-muted-foreground">
              Quality indicator
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Qualified Leads
              <HelpTooltip text="Leads that have been vetted and marked as 'Qualified' — meaning they meet your criteria for a potential deal. These leads are ready for direct outreach or a proposal." />
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadData?.byStatus?.QUALIFIED || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for outreach
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Page-level empty state when no leads exist */}
      {totalLeads === 0 && (
        <AnalyticsEmptyState variant="leads" />
      )}

      {/* Lead Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Trends</CardTitle>
          <CardDescription>New leads, qualified, and converted over time</CardDescription>
        </CardHeader>
        <CardContent>
          {leadTrends.length > 0 ? (
          <ChartErrorBoundary chartName="Lead Trends">
          <div role="img" aria-label="Lead trends chart">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={leadTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="newLeads" stackId="1" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} />
              <Area
                type="monotone"
                dataKey="qualified"
                stackId="2"
                stroke={CHART_COLORS[2]}
                fill={CHART_COLORS[2]}
              />
              <Area type="monotone" dataKey="converted" stackId="3" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          </ChartErrorBoundary>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No lead trend data yet
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceBreakdown.length > 0 ? sourceBreakdown.map((source) => (
                <div key={source.source} className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" role="link" tabIndex={0} aria-label={`View leads from ${source.source}: ${source.count} leads, ${source.percentage}%`} onClick={() => navigate(`/leads?source=${encodeURIComponent(source.source)}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/leads?source=${encodeURIComponent(source.source)}`); } }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{source.source}</span>
                    <span className="text-sm text-muted-foreground">
                      {source.count} ({source.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No lead source data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Leads with highest scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length > 0 ? topPerformers.map((performer: { id?: string; name: string; leads: number; converted: number; rate: string; score?: number }) => (
                <div key={performer.id || performer.name} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" role="link" tabIndex={0} aria-label={`View lead ${performer.name}, score ${performer.rate}`} onClick={() => performer.id && navigate(`/leads/${performer.id}`)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && performer.id) { e.preventDefault(); navigate(`/leads/${performer.id}`); } }}>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold">
                      #{topPerformers.indexOf(performer) + 1}
                    </div>
                    <div>
                      <p className="font-medium">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {performer.converted}/{performer.leads} converted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{performer.rate}</p>
                    <p className="text-xs text-muted-foreground">Lead score</p>
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No performance data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadAnalytics;
