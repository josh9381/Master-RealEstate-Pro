import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { formatRate, fmtMoney } from '@/lib/metricsCalculator';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { CHART_COLORS as COLORS } from '@/lib/chartColors';
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary';

const formatCurrency = fmtMoney;

const SourceROI = () => {
  const dateRangeRef = useRef<DateRange>(computeDateRange('90d'));

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['source-roi'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const response = await analyticsApi.getSourceROI(params);
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
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load source ROI data'} retry={refetch} />
      </div>
    );
  }

  const data = result;
  const sources = data?.sources || [];
  const totals = data?.totals || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-green-600" />
            Source ROI
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revenue efficiency per lead source
          </p>
        </div>
        <DateRangePicker value="90d" onChange={handleDateChange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.totalLeads || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Won</p>
            <p className="text-2xl font-bold text-green-600">{totals.totalWon || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Overall Conversion</p>
            <p className="text-2xl font-bold text-blue-600">{formatRate(totals.overallConversionRate || 0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source Chart */}
      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue by Source
            </CardTitle>
            <CardDescription>Total revenue generated from leads by their original source</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary chartName="Revenue by Source">
            <div role="img" aria-label="Revenue by source bar chart">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="source" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {sources.map((entry: { source: string }, i: number) => (
                    <Cell key={entry.source || `source-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      )}

      {/* Source Details Table */}
      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Source Performance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th scope="col" className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Source</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Leads</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Won</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Lost</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Conv. Rate</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Avg Deal</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Rev/Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s: { source: string; totalLeads: number; wonLeads: number; lostLeads: number; conversionRate: number; revenue: number; avgDealSize: number; revenuePerLead: number }, i: number) => (
                    <tr key={s.source} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-gray-900 dark:text-white">{s.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{s.totalLeads}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{s.wonLeads}</td>
                      <td className="py-3 px-4 text-right text-red-500">{s.lostLeads}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          s.conversionRate > (totals.overallConversionRate || 0) ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {formatRate(s.conversionRate)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(s.revenue)}</td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.avgDealSize)}</td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.revenuePerLead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {sources.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Source Data Yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Source ROI data will appear once you have leads with assigned sources.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SourceROI;
