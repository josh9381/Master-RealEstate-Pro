import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Target, Calendar, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

const LeadAnalytics = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const navigate = useNavigate();

  const { data: leadData = null, isLoading: loading, refetch } = useQuery({
    queryKey: ['lead-analytics'],
    queryFn: async () => {
      const response = await analyticsApi.getLeadAnalytics(dateRangeRef.current).catch(() => ({ data: null }));
      return response.data;
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

  // Use API data with fallbacks
  const totalLeads = leadData?.total || 0;
  const conversionRate = leadData?.conversionRate || 0;
  const averageScore = leadData?.averageScore || 0;
  const topLeads = leadData?.topLeads || [];

  // Lead trends from API data — use byStatus trends if available, otherwise show empty
  const leadTrends = leadData?.trends || [];

  // Source breakdown from API data
  const sourceBreakdown = leadData?.bySource
    ? Object.entries(leadData.bySource).map(([source, count]: [string, any]) => ({
        source,
        count: count as number,
        percentage: totalLeads > 0 ? Math.round(((count as number) / totalLeads) * 100) : 0
      }))
    : [];

  // Top performing leads
  const topPerformers = topLeads.length > 0
    ? topLeads.slice(0, 4).map((lead: any) => ({
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        leads: 1,
        converted: lead.status === 'WON' ? 1 : 0,
        rate: `${lead.score || 0}%`,
        score: lead.score
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Analytics</h1>
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
          <Button variant="outline" onClick={() => {
            const blob = new Blob([JSON.stringify({ topPerformers, leadData, topLeads }, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `lead-analytics-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
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
            <div className="text-2xl font-bold">{conversionRate}%</div>
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
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={leadTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="newLeads" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
              <Area
                type="monotone"
                dataKey="qualified"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
              />
              <Area type="monotone" dataKey="converted" stackId="3" stroke="#8b5cf6" fill="#8b5cf6" />
            </AreaChart>
          </ResponsiveContainer>
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
                <div key={source.source} className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/leads?source=${source.source}`)}>
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
              {topPerformers.length > 0 ? topPerformers.map((performer: any, index: number) => (
                <div key={performer.name} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => performer.id && navigate(`/leads/${performer.id}`)}>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {performer.converted}/{performer.leads} converted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{performer.rate}</p>
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
