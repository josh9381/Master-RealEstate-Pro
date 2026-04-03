import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Gauge, TrendingUp, Clock, ArrowUpDown, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';
import { CHART_COLORS } from '@/lib/chartColors';

const STAGE_ORDER = ['NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
const AVG_DAYS_PER_MONTH = 30.44;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LeadVelocity = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('1y'));

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lead-velocity'],
    queryFn: async () => {
      const range = dateRangeRef.current;
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (AVG_DAYS_PER_MONTH * MS_PER_DAY)));
      const response = await analyticsApi.getLeadVelocity({ months });
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
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load velocity data'} retry={refetch} />
      </div>
    );
  }

  const data = result;
  const sortedStages = data?.avgDaysPerStage
    ?.sort((a: { stage: string; avgDays: number }, b: { stage: string; avgDays: number }) => {
      const ai = STAGE_ORDER.indexOf(a.stage);
      const bi = STAGE_ORDER.indexOf(b.stage);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gauge className="h-7 w-7 text-orange-600" />
            Lead Velocity
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            How quickly leads move through your pipeline
          </p>
        </div>
        <DateRangePicker value="1y" onChange={handleDateChange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Days to Close</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.avgDaysToClose || 0} days
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Leads Tracked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.totalLeadsTracked || 0}
                </p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-blue-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pipeline Stages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sortedStages.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Days per Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Average Days per Stage
          </CardTitle>
          <CardDescription>How long leads spend in each pipeline stage before advancing</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedStages.length > 0 ? (
            <ChartErrorBoundary chartName="Stage Duration">
            <div role="img" aria-label="Average days per pipeline stage bar chart">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sortedStages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => [`${value} days`, 'Avg Duration']} />
                <Bar dataKey="avgDays" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
          ) : (
            <p className="text-gray-500 text-center py-8">No stage transition data available yet</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Velocity Trend */}
      {data?.monthlyVelocity && data.monthlyVelocity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Pipeline Velocity
            </CardTitle>
            <CardDescription>Leads entering and exiting the pipeline each month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary chartName="Pipeline Velocity">
            <div role="img" aria-label="Monthly pipeline velocity line chart">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.monthlyVelocity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entered" stroke={CHART_COLORS[0]} strokeWidth={2} name="Entered Pipeline" />
                <Line type="monotone" dataKey="won" stroke={CHART_COLORS[2]} strokeWidth={2} name="Won" />
                <Line type="monotone" dataKey="lost" stroke={CHART_COLORS[3]} strokeWidth={2} name="Lost" />
              </LineChart>
            </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Stage Details Table */}
      {sortedStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage Duration Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th scope="col" className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Avg Days</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Transitions</th>
                    <th scope="col" className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStages.map((s: { stage: string; avgDays: number; count: number }) => {
                    const maxDays = Math.max(...sortedStages.map((x: { avgDays: number }) => x.avgDays));
                    const pct = maxDays > 0 ? (s.avgDays / maxDays) * 100 : 0;
                    return (
                      <tr key={s.stage} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{s.stage}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{s.avgDays} days</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{s.count}</td>
                        <td className="py-3 px-4 w-1/3">
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeadVelocity;
