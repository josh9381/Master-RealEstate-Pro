import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Target, Plus, TrendingUp, Calendar, Trash2, Edit2, Check, X,
  Trophy, Zap, Phone, CalendarCheck, Clock, DollarSign, Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import { goalsApi } from '@/lib/api';
import { calcRateClamped } from '@/lib/metricsCalculator';
import { CHART_COLORS, semanticColors } from '@/lib/chartColors';

const METRIC_TYPES = [
  { value: 'LEADS_GENERATED', label: 'Leads Generated', icon: Users, color: CHART_COLORS[0], unit: '' },
  { value: 'DEALS_CLOSED', label: 'Deals Closed', icon: Trophy, color: CHART_COLORS[2], unit: '' },
  { value: 'REVENUE', label: 'Revenue', icon: DollarSign, color: CHART_COLORS[1], unit: '$' },
  { value: 'CONVERSION_RATE', label: 'Conversion Rate', icon: TrendingUp, color: CHART_COLORS[7], unit: '%' },
  { value: 'CALLS_MADE', label: 'Calls Made', icon: Phone, color: CHART_COLORS[4], unit: '' },
  { value: 'APPOINTMENTS_SET', label: 'Appointments Set', icon: CalendarCheck, color: CHART_COLORS[5], unit: '' },
  { value: 'RESPONSE_TIME', label: 'Avg Response Time (hrs)', icon: Clock, color: CHART_COLORS[3], unit: 'h' },
  { value: 'CUSTOM', label: 'Custom', icon: Zap, color: CHART_COLORS[6], unit: '' },
];

const PERIODS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const formatValue = (val: number, metricType: string) => {
  if (metricType === 'REVENUE') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  if (metricType === 'CONVERSION_RATE') return `${val}%`;
  if (metricType === 'RESPONSE_TIME') return `${val}h`;
  return val.toLocaleString();
};

interface GoalFormData {
  name: string;
  metricType: string;
  targetValue: string;
  startDate: string;
  endDate: string;
  period: string;
  notes: string;
}

const defaultForm: GoalFormData = {
  name: '',
  metricType: 'LEADS_GENERATED',
  targetValue: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  period: 'MONTHLY',
  notes: '',
};

const GoalTracking = () => {
  const queryClient = useQueryClient();
  const showConfirm = useConfirm();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormData>(defaultForm);

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await goalsApi.list();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof goalsApi.create>[0]) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditingId(null);
      setForm(defaultForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(form.targetValue);
    if (isNaN(targetNum) || targetNum <= 0) {
      toast.error('Target value must be a positive number');
      return;
    }
    if (form.endDate && form.startDate && new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    const payload = {
      name: form.name,
      metricType: form.metricType,
      targetValue: targetNum,
      startDate: form.startDate,
      endDate: form.endDate,
      period: form.period,
      notes: form.notes || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (goal: Record<string, unknown>) => {
    setForm({
      name: (goal.name as string) || '',
      metricType: (goal.metricType as string) || 'LEADS_GENERATED',
      targetValue: String(goal.targetValue),
      startDate: ((goal.startDate as string) || '').split('T')[0] || '',
      endDate: ((goal.endDate as string) || '').split('T')[0] || '',
      period: (goal.period as string) || 'MONTHLY',
      notes: (goal.notes as string) || '',
    });
    setEditingId(goal.id as string);
    setShowForm(true);
  };

  const goals = result || [];
  const activeGoals = goals.filter((g: Record<string, unknown>) => g.isActive);
  const completedGoals = goals.filter((g: Record<string, unknown>) => g.completedAt || (typeof g.progress === 'number' && g.progress >= 100));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load goals'} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            Goal Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Set targets and track your progress
          </p>
        </div>
        <Button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(defaultForm); }}
          className="flex items-center gap-2"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Goal'}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Goals</p>
            <p className="text-2xl font-bold text-foreground">{activeGoals.length}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{completedGoals.length}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Progress</p>
            <p className="text-2xl font-bold text-info">
              {activeGoals.length > 0
                ? Math.round(activeGoals.reduce((s: number, g: Record<string, unknown>) => s + ((g.progress as number) || 0), 0) / activeGoals.length)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Goal' : 'Create New Goal'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update your goal settings' : 'Set a measurable target to track your performance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Close 10 deals this month"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Metric Type</label>
                  <select
                    value={form.metricType}
                    onChange={(e) => setForm({ ...form, metricType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  >
                    {METRIC_TYPES.map((mt) => (
                      <option key={mt.value} value={mt.value}>{mt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Target Value</label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={form.targetValue}
                    onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                    placeholder="e.g., 10"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Period</label>
                  <select
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional context"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-card dark:border-border dark:text-foreground transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingId ? 'Update Goal' : 'Create Goal'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Active Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal: Record<string, unknown>) => {
              const metric = METRIC_TYPES.find((m) => m.value === goal.metricType) || METRIC_TYPES[METRIC_TYPES.length - 1];
              const Icon = metric.icon;
              const progress = (goal.progress as number) || ((goal.targetValue as number) > 0 ? calcRateClamped(goal.currentValue as number, goal.targetValue as number) : 0);
              const isCompleted = progress >= 100;
              const endMs = new Date(goal.endDate as string).getTime();
              const daysLeft = isNaN(endMs) ? 0 : Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <Card key={goal.id as string} className={isCompleted ? 'border-success dark:border-success' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${metric.color}15`, color: metric.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{goal.name as string}</h3>
                          <p className="text-xs text-muted-foreground">{metric.label} · {goal.period as string}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(goal)} className="p-1 text-muted-foreground hover:text-primary transition-colors duration-200" aria-label="Edit goal">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => { if (await showConfirm({ title: 'Delete Goal', message: 'Delete this goal?', confirmLabel: 'Delete', variant: 'destructive' })) deleteMutation.mutate(goal.id as string); }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors duration-200"
                          aria-label="Delete goal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {formatValue(goal.currentValue as number, goal.metricType as string)} / {formatValue(goal.targetValue as number, goal.metricType as string)}
                        </span>
                        <span className={`font-medium ${isCompleted ? 'text-success' : 'text-foreground'}`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-valuenow={Math.min(100, progress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${(goal.name as string)} progress: ${progress}%`}
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, progress)}%`,
                            backgroundColor: isCompleted ? semanticColors.success : metric.color,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {daysLeft} days left
                      </span>
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <Check className="h-3 w-3" /> Goal Achieved!
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Completed Goals</h2>
          <div className="space-y-2">
            {completedGoals.map((goal: Record<string, unknown>) => {
              const metric = METRIC_TYPES.find((m) => m.value === goal.metricType) || METRIC_TYPES[METRIC_TYPES.length - 1];
              return (
                <div key={goal.id as string} className="flex items-center justify-between p-3 bg-success/10 dark:bg-success/10 rounded-lg border border-success/30 dark:border-success/30">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-success" />
                    <div>
                      <span className="font-medium text-foreground">{goal.name as string}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatValue(goal.targetValue as number, goal.metricType as string)} {metric.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => { if (await showConfirm({ title: 'Delete Goal', message: 'Delete this goal?', confirmLabel: 'Delete', variant: 'destructive' })) deleteMutation.mutate(goal.id as string); }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors duration-200"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Goals Set</h3>
            <p className="text-muted-foreground mb-4">
              Create goals to track your real estate performance metrics
            </p>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" /> Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoalTracking;
