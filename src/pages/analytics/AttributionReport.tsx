import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  GitBranch, DollarSign, Users, TrendingUp, 
  Info, BarChart3, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { formatRate, fmtMoney } from '@/lib/metricsCalculator';
import { DateRangePicker, DateRange } from '@/components/shared/DateRangePicker';
import { computeDateRange } from '@/components/shared/dateRangeUtils';
import { CHART_COLORS as COLORS } from '@/lib/chartColors';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';
import { PageEmptyState } from '@/components/ui/PageEmptyState';

type AttributionModel = 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'u-shaped';

const MODEL_OPTIONS: { value: AttributionModel; label: string; description: string }[] = [
  { value: 'first-touch', label: 'First Touch', description: '100% credit to the first interaction' },
  { value: 'last-touch', label: 'Last Touch', description: '100% credit to the last interaction before conversion' },
  { value: 'linear', label: 'Linear', description: 'Equal credit across all touchpoints' },
  { value: 'time-decay', label: 'Time Decay', description: 'More credit to recent touchpoints (7-day half-life)' },
  { value: 'u-shaped', label: 'U-Shaped', description: '40% first, 40% last, 20% split among middle touches' },
];

const formatCurrency = fmtMoney;

const AttributionReport = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('90d'));
  const [model, setModel] = useState<AttributionModel>('linear');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attribution-report', model],
    queryFn: async () => {
      const params = { ...dateRangeRef.current, model };
      const response = await analyticsApi.getAttributionReport(params);
      return response.data;
    },
  });

  const handleDateChange = (range: DateRange, _preset?: string) => {
    dateRangeRef.current = range;
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load attribution report'} retry={refetch} />
      </div>
    );
  }

  const data = result;
  const noData = !data || data.conversions === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-foreground flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-info" />
            Multi-Touch Attribution
          </h1>
          <p className="text-muted-foreground mt-1">
            Understand which channels and campaigns drive conversions
          </p>
        </div>
        <DateRangePicker value="90d" onChange={handleDateChange} />
      </div>

      {/* Model Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Attribution Model</CardTitle>
          <CardDescription>Choose how conversion credit is distributed across touchpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setModel(opt.value)}
                aria-pressed={model === opt.value}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  model === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {MODEL_OPTIONS.find((o) => o.value === model)?.description}
          </p>
        </CardContent>
      </Card>

      {noData ? (
        <PageEmptyState
          icon={<GitBranch className="h-12 w-12" />}
          title="No Conversions Yet"
          description="Attribution data will appear once leads are marked as Won. Try adjusting the date range."
        />
      ) : (
        <>
          {/* Truncation notice */}
          {data.capped && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 dark:bg-warning/10 border border-warning/30 dark:border-warning/30 text-sm text-warning-foreground dark:text-warning">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Showing attribution for the most recent 500 conversions. Narrow your date range for complete results.</span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    <p className="text-2xl font-bold text-foreground">{data.conversions}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-40" />
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(data.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-success opacity-40" />
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sources</p>
                    <p className="text-2xl font-bold text-foreground">{data.bySource?.length || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary opacity-40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue by Channel
                </CardTitle>
                <CardDescription>Attributed revenue for each marketing channel</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byChannel && data.byChannel.length > 0 ? (
                  <ChartErrorBoundary chartName="Revenue by Channel">
                  <div role="img" aria-label="Revenue by channel bar chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.byChannel}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                  </ChartErrorBoundary>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No channel data available</p>
                )}
              </CardContent>
            </Card>

            {/* Source Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Revenue by Source
                </CardTitle>
                <CardDescription>Where your winning leads came from</CardDescription>
              </CardHeader>
              <CardContent>
                {data.bySource && data.bySource.length > 0 ? (
                  <ChartErrorBoundary chartName="Revenue by Source">
                  <div role="img" aria-label="Revenue by source pie chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.bySource}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="revenue"
                        nameKey="name"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} (${formatRate(percent * 100, 0)}%)`}
                      >
                        {data.bySource.map((entry: { name: string }, i: number) => (
                          <Cell key={entry.name || `source-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                  </ChartErrorBoundary>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No source data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaign Attribution Table */}
          {data.byCampaign && data.byCampaign.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Attribution</CardTitle>
                <CardDescription>
                  Attributed conversions and revenue per campaign ({MODEL_OPTIONS.find((o) => o.value === model)?.label} model)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign</th>
                        <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Attributed Credit</th>
                        <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Attributed Revenue</th>
                        <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCampaign.map((c: { campaignId: string; name: string; credit: number; revenue: number; conversions: number }) => (
                        <tr key={c.campaignId || c.name} className="border-b border-border hover:bg-muted transition-colors duration-200">
                          <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{formatRate(c.credit)}</td>
                          <td className="py-3 px-4 text-right text-success font-medium">{formatCurrency(c.revenue)}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{formatRate(c.conversions, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lead Touchpoint Journey */}
          {data.leads && data.leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversion Journeys</CardTitle>
                <CardDescription>Individual lead paths to conversion with touchpoint credits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.leads.slice(0, 20).map((lead: { leadId: string; name: string; source: string; touchpoints: number; revenue: number; credits?: { channel: string; weight: number }[] }) => (
                  <div key={lead.leadId} className="border border-border rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted transition-colors"
                      onClick={() => setExpandedLead(expandedLead === lead.leadId ? null : lead.leadId)}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{lead.name}</span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          {lead.source}
                        </span>
                        <span className="text-xs text-muted-foreground">{lead.touchpoints} touchpoints</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-success font-medium">{formatCurrency(lead.revenue)}</span>
                        {expandedLead === lead.leadId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expandedLead === lead.leadId && lead.credits && lead.credits.length > 0 && (() => {
                      const credits = lead.credits;
                      return (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {credits.map((c: { channel: string; weight: number }, i: number) => (
                            <div key={c.channel} className="flex items-center gap-1">
                              <div
                                className="text-xs px-2 py-1 rounded font-medium"
                                style={{
                                  backgroundColor: `${COLORS[i % COLORS.length]}20`,
                                  color: COLORS[i % COLORS.length],
                                }}
                              >
                                {c.channel} ({formatRate(c.weight * 100, 0)}%)
                              </div>
                              {i < credits.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AttributionReport;
