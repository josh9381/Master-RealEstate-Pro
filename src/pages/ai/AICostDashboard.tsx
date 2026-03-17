import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Cpu, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aiApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { formatCurrency } from '@/lib/metricsCalculator';

interface CostData {
  period: string;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  byModel: Array<{ model: string; cost: number; tokens: number; requests: number }>;
  byUser: Array<{ userId: string; name: string; cost: number; tokens: number; requests: number }>;
  costHistory: Array<{ month: string; cost: number }>;
  budget: {
    warning: number;
    caution: number;
    hardLimit: number;
    alertEnabled: boolean;
    currentSpend: number;
    percentUsed: number;
  };
}

const AICostDashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai', 'cost-dashboard', timeRange],
    queryFn: async () => {
      const res = await aiApi.getCostDashboard(timeRange);
      return res.data as CostData;
    },
  });

  if (isLoading) {
    return <LoadingSkeleton rows={4} showChart />;
  }

  const budgetStatus = !data?.budget.alertEnabled
    ? 'disabled'
    : data.budget.currentSpend >= data.budget.hardLimit
      ? 'exceeded'
      : data.budget.currentSpend >= data.budget.caution
        ? 'caution'
        : data.budget.currentSpend >= data.budget.warning
          ? 'warning'
          : 'ok';

  const budgetColor = {
    disabled: 'text-muted-foreground',
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    caution: 'text-orange-600',
    exceeded: 'text-red-600',
  }[budgetStatus];

  const budgetBadge = {
    disabled: { variant: 'secondary' as const, label: 'Alerts Off' },
    ok: { variant: 'success' as const, label: 'Under Budget' },
    warning: { variant: 'warning' as const, label: 'Warning' },
    caution: { variant: 'warning' as const, label: 'Caution' },
    exceeded: { variant: 'destructive' as const, label: 'Limit Reached' },
  }[budgetStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">AI Cost Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor AI spending and usage across your organization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={String(timeRange)}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">${(data?.totalCost ?? 0).toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{((data?.totalTokens ?? 0) / 1000).toFixed(1)}k</p>
              </div>
              <Cpu className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requests</p>
                <p className="text-2xl font-bold">{data?.totalRequests ?? 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget Status</p>
                <p className={`text-2xl font-bold ${budgetColor}`}>
                  {data?.budget.alertEnabled
                    ? `${Math.round(data.budget.percentUsed)}%`
                    : 'Off'}
                </p>
              </div>
              <Badge variant={budgetBadge.variant}>{budgetBadge.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {data?.budget.alertEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Budget Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${data.budget.currentSpend.toFixed(2)} of ${data.budget.hardLimit.toFixed(2)}
                </span>
                <span className={budgetColor}>{Math.round(data.budget.percentUsed)}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetStatus === 'exceeded' ? 'bg-red-500' :
                    budgetStatus === 'caution' ? 'bg-orange-500' :
                    budgetStatus === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, data.budget.percentUsed)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Warning: ${data.budget.warning}</span>
                <span>Caution: ${data.budget.caution}</span>
                <span>Limit: ${data.budget.hardLimit}</span>
              </div>
            </div>
            {budgetStatus === 'exceeded' && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  Budget hard limit reached. AI generation is blocked until the next billing cycle or an admin increases the limit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost History Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost History</CardTitle>
            <CardDescription>Monthly AI spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            {(data?.costHistory?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data!.costHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                No cost history available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Model */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Model</CardTitle>
            <CardDescription>Spending breakdown per AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {(data?.byModel?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {data!.byModel.map((m) => (
                  <div key={m.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{m.model}</span>
                      <span className="text-xs text-muted-foreground">{m.requests} req</span>
                    </div>
                    <span className="text-sm font-medium">${formatCurrency(m.cost)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
                No model usage data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost by Team Member</CardTitle>
          <CardDescription>Individual AI usage this period</CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.byUser?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">User</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Requests</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Tokens</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.byUser.map((u) => (
                    <tr key={u.userId} className="border-b last:border-0">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-right">{u.requests}</td>
                      <td className="py-2 text-right">{(u.tokens / 1000).toFixed(1)}k</td>
                      <td className="py-2 text-right font-medium">${formatCurrency(u.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[80px] text-sm text-muted-foreground">
              No user usage data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICostDashboard;
