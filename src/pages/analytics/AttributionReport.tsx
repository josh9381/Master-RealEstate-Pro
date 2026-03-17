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
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';

type AttributionModel = 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'u-shaped';

const MODEL_OPTIONS: { value: AttributionModel; label: string; description: string }[] = [
  { value: 'first-touch', label: 'First Touch', description: '100% credit to the first interaction' },
  { value: 'last-touch', label: 'Last Touch', description: '100% credit to the last interaction before conversion' },
  { value: 'linear', label: 'Linear', description: 'Equal credit across all touchpoints' },
  { value: 'time-decay', label: 'Time Decay', description: 'More credit to recent touchpoints (7-day half-life)' },
  { value: 'u-shaped', label: 'U-Shaped', description: '40% first, 40% last, 20% split among middle touches' },
];

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

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

  const handleDateChange = (range: DateRange, _preset?: any) => {
    dateRangeRef.current = range;
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={(error as Error)?.message || 'Failed to load attribution report'} retry={refetch} />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-blue-600" />
            Multi-Touch Attribution
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
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
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  model === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {MODEL_OPTIONS.find((o) => o.value === model)?.description}
          </p>
        </CardContent>
      </Card>

      {noData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Conversions Yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Attribution data will appear once leads are marked as Won. Try adjusting the date range.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Conversions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.conversions}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500 opacity-40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sources</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.bySource?.length || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500 opacity-40" />
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.byChannel}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No channel data available</p>
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
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.bySource}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="revenue"
                        nameKey="name"
                        label={({ name, percent }: any) => `${name} (${formatRate(percent * 100, 0)}%)`}
                      >
                        {data.bySource.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No source data available</p>
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
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Campaign</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Attributed Credit</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Attributed Revenue</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCampaign.map((c: any) => (
                        <tr key={c.campaignId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                          <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{formatRate(c.credit)}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(c.revenue)}</td>
                          <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{formatRate(c.conversions, 1)}</td>
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
                {data.leads.slice(0, 20).map((lead: any) => (
                  <div key={lead.leadId} className="border dark:border-gray-700 rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setExpandedLead(expandedLead === lead.leadId ? null : lead.leadId)}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{lead.name}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                          {lead.source}
                        </span>
                        <span className="text-xs text-gray-500">{lead.touchpoints} touchpoints</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600 font-medium">{formatCurrency(lead.revenue)}</span>
                        {expandedLead === lead.leadId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expandedLead === lead.leadId && lead.credits && (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {lead.credits.map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              <div
                                className="text-xs px-2 py-1 rounded font-medium"
                                style={{
                                  backgroundColor: `${COLORS[i % COLORS.length]}20`,
                                  color: COLORS[i % COLORS.length],
                                }}
                              >
                                {c.channel} ({formatRate(c.credit * 100, 0)}%)
                              </div>
                              {i < lead.credits.length - 1 && <ArrowRight className="h-3 w-3 text-gray-300" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
