import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { analyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';
import { CHART_COLORS } from '@/lib/chartColors';

const PERIOD_PRESETS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  const days = preset === 'last7' ? 7 : preset === 'last30' ? 30 : 90;
  start.setDate(end.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

const ChangeIndicator = ({ value }: { value: number }) => {
  if (value > 0) return <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><TrendingUp className="h-4 w-4" /> +{value}%</span>;
  if (value < 0) return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><TrendingDown className="h-4 w-4" /> {value}%</span>;
  return <span className="flex items-center gap-1 text-muted-foreground text-sm font-medium"><Minus className="h-4 w-4" /> 0%</span>;
};

const PeriodComparison = () => {
  const [preset, setPreset] = useState('last30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = preset === 'custom' && customStart && customEnd
    ? { startDate: customStart, endDate: customEnd }
    : getDateRange(preset);

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['period-comparison', range.startDate, range.endDate],
    queryFn: async () => {
      const response = await analyticsApi.getPeriodComparison({ startDate: range.startDate, endDate: range.endDate });
      return response.data;
    },
    enabled: !!(range.startDate && range.endDate),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load comparison data'} retry={refetch} />
      </div>
    );
  }

  const current = result?.current || {};
  const previous = result?.previous || {};
  const changes = result?.changes || {};

  const metrics = [
    { key: 'totalLeads', label: 'Total Leads' },
    { key: 'newLeads', label: 'New Leads' },
    { key: 'contactedLeads', label: 'Contacted' },
    { key: 'convertedLeads', label: 'Converted' },
    { key: 'totalRevenue', label: 'Revenue', isCurrency: true },
    { key: 'activeCampaigns', label: 'Active Campaigns' },
    { key: 'tasksCompleted', label: 'Tasks Completed' },
    { key: 'appointmentsSet', label: 'Appointments Set' },
  ];

  const formatVal = (val: unknown, isCurrency?: boolean) => {
    const num = Number(val) || 0;
    return isCurrency
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
      : num.toLocaleString();
  };

  const chartData = metrics
    .filter((m) => (Number(current[m.key]) || 0) > 0 || (Number(previous[m.key]) || 0) > 0)
    .map((m) => ({
      name: m.label,
      'Current Period': Number(current[m.key]) || 0,
      'Previous Period': Number(previous[m.key]) || 0,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Period Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare current period performance with the previous period
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom date picker */}
      {preset === 'custom' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Start date"
              className="px-3 py-1.5 border rounded-lg text-sm dark:bg-card dark:border-border dark:text-foreground transition-colors"
            />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => setCustomEnd(e.target.value)}
            aria-label="End date"
            className="px-3 py-1.5 border rounded-lg text-sm dark:bg-card dark:border-border dark:text-foreground transition-colors"
          />
        </div>
      )}

      {/* Period labels */}
      {result?.periodLabel && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-blue-600">Current: {result.periodLabel.current}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-muted-foreground">Previous: {result.periodLabel.previous}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.key} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {formatVal(current[m.key], m.isCurrency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    vs {formatVal(previous[m.key], m.isCurrency)}
                  </p>
                </div>
                {changes[m.key] != null && <ChangeIndicator value={changes[m.key]} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
            <CardDescription>Current vs previous period metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary chartName="Period Comparison">
            <div className="h-[400px]" role="img" aria-label="Period comparison bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Current Period" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Previous Period" fill={CHART_COLORS[6]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeriodComparison;
