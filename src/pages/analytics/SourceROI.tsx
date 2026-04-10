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
import { DateRangePicker, DateRange } from '@/components/shared/DateRangePicker';
import { computeDateRange } from '@/components/shared/dateRangeUtils';
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
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded" />)}
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-success" />
            Source ROI
          </h1>
          <p className="text-muted-foreground mt-1">
            Revenue efficiency per lead source
          </p>
        </div>
        <DateRangePicker value="90d" onChange={handleDateChange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold text-foreground">{totals.totalLeads || 0}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Won</p>
            <p className="text-2xl font-bold text-success">{totals.totalWon || 0}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall Conversion</p>
            <p className="text-2xl font-bold text-primary">{formatRate(totals.overallConversionRate || 0)}%</p>
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
                  <tr className="border-b border-border">
                    <th scope="col" className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Leads</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Won</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Lost</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Conv. Rate</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Deal</th>
                    <th scope="col" className="text-right py-3 px-4 font-medium text-muted-foreground">Rev/Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s: { source: string; totalLeads: number; wonLeads: number; lostLeads: number; conversionRate: number; revenue: number; avgDealSize: number; revenuePerLead: number }, i: number) => (
                    <tr key={s.source} className="border-b border-border hover:bg-muted transition-colors duration-200">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-foreground">{s.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{s.totalLeads}</td>
                      <td className="py-3 px-4 text-right text-success font-medium">{s.wonLeads}</td>
                      <td className="py-3 px-4 text-right text-destructive">{s.lostLeads}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          s.conversionRate > (totals.overallConversionRate || 0) ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {formatRate(s.conversionRate)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-success font-medium">{formatCurrency(s.revenue)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(s.avgDealSize)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(s.revenuePerLead)}</td>
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
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Source Data Yet</h3>
            <p className="text-muted-foreground">
              Source ROI data will appear once you have leads with assigned sources.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SourceROI;
