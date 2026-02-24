import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, Users, Target, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { analyticsApi } from '@/lib/api';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const ConversionReports = () => {
  const navigate = useNavigate();
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const { data: conversionResult, isLoading: loading, refetch } = useQuery({
    queryKey: ['conversion-reports'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const [leads, campaigns] = await Promise.all([
        analyticsApi.getLeadAnalytics(params).catch((e: Error) => { console.error('Lead analytics failed:', e); return null; }),
        analyticsApi.getCampaignAnalytics(params).catch((e: Error) => { console.error('Campaign analytics failed:', e); return null; }),
      ]);
      // Also try to get conversion funnel for time-to-convert data
      let funnelData = null;
      try {
        funnelData = await analyticsApi.getConversionFunnel(params);
      } catch {
        // Conversion funnel is optional
      }
      const leadResult = leads?.data || leads;
      if (funnelData?.data?.timeToConvert) {
        leadResult.timeToConvert = funnelData.data.timeToConvert;
      }
      return {
        leadData: leadResult,
        campaignData: campaigns?.data || campaigns,
      };
    },
  });

  const leadData = conversionResult?.leadData ?? null;
  const campaignData = conversionResult?.campaignData ?? null;

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  // Build conversion funnel from lead status data
  const conversionFunnel = leadData?.byStatus
    ? (Object.entries(leadData.byStatus) as [string, number][]).map(([stage, count]) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: count,
        percentage: (leadData.total && leadData.total > 0) ? ((count / leadData.total) * 100).toFixed(1) : 0,
      }))
    : [
        { stage: 'New', count: 0, percentage: 0 },
        { stage: 'Contacted', count: 0, percentage: 0 },
        { stage: 'Qualified', count: 0, percentage: 0 },
        { stage: 'Proposal', count: 0, percentage: 0 },
        { stage: 'Won', count: 0, percentage: 0 },
      ];

  // Build source conversion from lead source data
  const totalConversions = leadData?.byStatus?.won || leadData?.byStatus?.WON || 0;
  const overallConversionRate = leadData?.conversionRate || 0;
  const totalLeadCount = leadData?.total || 0;
  const sourceConversion = leadData?.bySource
    ? (Object.entries(leadData.bySource) as [string, number][]).map(([source, count]) => {
        const convRate = totalLeadCount > 0 ? (totalConversions / totalLeadCount) : 0;
        const converted = Math.round(count * convRate);
        return {
          source: source.charAt(0).toUpperCase() + source.slice(1).replace('-', ' '),
          leads: count,
          converted,
          rate: totalLeadCount > 0 ? ((converted / count) * 100).toFixed(1) : '0.0'
        };
      })
    : [];


  // Time to convert — use real API data if available
  const COLORS_TTC = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const timeToConvert: { days: string; count: number; color: string }[] = leadData?.timeToConvert
    ? leadData.timeToConvert.map((item: { days: string; count: number }, i: number) => ({
        days: item.days,
        count: item.count,
        color: COLORS_TTC[i % COLORS_TTC.length],
      })).filter((d: { count: number }) => d.count > 0)
    : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
        <div className="h-64 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversion Reports</h1>
          <p className="text-muted-foreground mt-2">
            Track conversion rates and funnel performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={() => {
            const data = JSON.stringify({ conversionFunnel, sourceConversion, timeToConvert }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conversion-report.json';
            a.click();
            URL.revokeObjectURL(url);
          }}>Export Report</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Overall Conversion
              <HelpTooltip text="The percentage of all leads that converted to 'Won' status. This is your end-to-end conversion rate from first contact to closed deal." />
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConversionRate}%</div>
            <p className="text-xs text-muted-foreground">From lead data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">Won deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Performance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignData?.performance?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Conversion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourceConversion.length > 0 ? Math.max(...sourceConversion.map(s => parseFloat(String(s.rate)))).toFixed(1) : 0}%</div>
            <p className="text-xs text-muted-foreground">Top source conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Page-level empty state when no conversions exist */}
      {totalConversions === 0 && overallConversionRate === 0 && (
        <AnalyticsEmptyState variant="conversions" />
      )}

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead journey from first touch to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionFunnel.length > 0 ? conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/leads?status=${stage.stage.toUpperCase()}`)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stage.stage}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage.count.toLocaleString()} leads
                        {index > 0 && ` • ${stage.percentage}% of total`}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">{stage.percentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No conversion funnel data yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Conversion */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion by Source</CardTitle>
            <CardDescription>Performance of different lead sources</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceConversion.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceConversion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {sourceConversion.map((source) => (
                <div key={source.source} className="flex items-center justify-between text-sm">
                  <span>{source.source}</span>
                  <span className="font-medium">
                    {source.converted}/{source.leads} ({source.rate}%)
                  </span>
                </div>
              ))}
            </div>
            </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No source conversion data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time to Convert */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Convert</CardTitle>
            <CardDescription>How long it takes leads to convert</CardDescription>
          </CardHeader>
          <CardContent>
            {timeToConvert.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={timeToConvert}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ days, count }) => `${days}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {timeToConvert.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {timeToConvert.map((item) => (
                <div key={item.days} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span>{item.days} days</span>
                  </div>
                  <span className="font-medium">{item.count} conversions</span>
                </div>
              ))}
            </div>
            </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No time-to-convert data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConversionReports;
