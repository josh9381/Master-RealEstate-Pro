import { logger } from '@/lib/logger'
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Workflow as WorkflowIcon, Plus, Play, Pause, Edit, Trash2, BarChart3, RefreshCw, LayoutGrid, LayoutList, ChevronRight, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { workflowsApi } from '@/lib/api';
import { calcRate, formatRate } from '@/lib/metricsCalculator';
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { WorkflowAction, WorkflowExecution, WorkflowTriggerData } from '@/types';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerData: WorkflowTriggerData;
  actions: WorkflowAction[];
  executions: number;
  successRate: number | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  workflowExecutions?: WorkflowExecution[];
}

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
}

const WorkflowsList = () => {
  const { toast } = useToast();
  const showConfirm = useConfirm();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [analyticsWorkflow, setAnalyticsWorkflow] = useState<Workflow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const [workflowsResponse, statsResponse] = await Promise.all([
        workflowsApi.getWorkflows(),
        workflowsApi.getStats(),
      ]);

      const wfList = workflowsResponse?.data?.workflows
        || workflowsResponse?.workflows
        || (Array.isArray(workflowsResponse?.data) ? workflowsResponse.data : null)
        || (Array.isArray(workflowsResponse) ? workflowsResponse : []);

      const stats: WorkflowStats = statsResponse?.data ? statsResponse.data : {
        totalWorkflows: 0,
        activeWorkflows: 0,
        inactiveWorkflows: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
      };

      return { workflows: wfList as Workflow[], stats };
    },
  });

  const workflows = data?.workflows ?? [];
  const filteredWorkflows = searchQuery
    ? workflows.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : workflows;
  
  // Derive stats from workflow data to ensure consistency between stat cards and individual workflow cards
  const apiStats = data?.stats ?? {
    totalWorkflows: 0,
    activeWorkflows: 0,
    inactiveWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
  };
  const derivedTotalExecutions = workflows.reduce((sum, w) => sum + (w.executions || 0), 0);
  const stats = {
    ...apiStats,
    totalWorkflows: workflows.length || apiStats.totalWorkflows,
    activeWorkflows: workflows.filter(w => w.isActive).length || apiStats.activeWorkflows,
    inactiveWorkflows: workflows.filter(w => !w.isActive).length || apiStats.inactiveWorkflows,
    // Use the sum of per-workflow counters so stats match what's shown on each card
    totalExecutions: derivedTotalExecutions || apiStats.totalExecutions,
    successfulExecutions: apiStats.successfulExecutions,
    failedExecutions: apiStats.failedExecutions,
    // Backend calcRate() already returns 0-100 scale; no conversion needed
    successRate: apiStats.successRate,
  };

  // Helper: extract the actions array from the backend shape { conditions: [], actions: [...] }
  const getActionsList = (actions: unknown): WorkflowAction[] => {
    if (Array.isArray(actions)) return actions;
    if (actions && typeof actions === 'object' && Array.isArray((actions as Record<string, unknown>).actions)) {
      return (actions as Record<string, unknown>).actions as WorkflowAction[];
    }
    return [];
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const toggleWorkflowStatus = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) {
        toast.error('Workflow not found');
        return;
      }

      const newActiveState = !workflow.isActive;
      
      // Show loading toast
      const action = newActiveState ? 'Activating' : 'Pausing';
      toast.info(`${action} workflow...`);
      
      await workflowsApi.toggleWorkflow(workflowId, newActiveState);
      
      toast.success(`Workflow ${newActiveState ? 'activated' : 'paused'} successfully`);
      await refetch();
    } catch (error: unknown) {
      logger.error('Failed to toggle workflow:', error);
      const errorMessage = (error as Error & { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to toggle workflow status';
      toast.error(errorMessage);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    
    // Check if workflow is active
    if (workflow?.isActive) {
      toast.error('Cannot delete an active workflow. Please pause it first.');
      return;
    }

    if (!await showConfirm({ title: 'Delete Workflow', message: 'Are you sure you want to delete this workflow? This action cannot be undone.', confirmLabel: 'Delete', variant: 'destructive' })) {
      return;
    }

    try {
      await workflowsApi.deleteWorkflow(workflowId);
      toast.success('Workflow deleted successfully');
      await refetch();
    } catch (error: unknown) {
      logger.error('Failed to delete workflow:', error);
      const errorMessage = (error as Error & { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete workflow';
      toast.error(errorMessage);
    }
  };

  const viewAnalytics = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setAnalyticsWorkflow(workflow);
      // Fetch fresh analytics data for this workflow
      try {
        const analytics = await workflowsApi.getAnalytics(workflowId);
        const data = analytics?.data || analytics;
        if (data) {
          setAnalyticsWorkflow(prev => prev ? {
            ...prev,
            executions: data.totalExecutions ?? prev.executions,
            successRate: data.successRate ?? prev.successRate,
            lastRunAt: data.lastRunAt ?? prev.lastRunAt,
            workflowExecutions: data.recentExecutions ?? prev.workflowExecutions,
          } : prev);
        }
      } catch (error) {
        logger.error('Failed to fetch analytics:', error);
        toast.error('Could not refresh analytics data');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with helpful tips */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-primary/80 to-primary rounded-xl shadow-lg">
              <WorkflowIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">Workflows</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automate your marketing and sales processes with powerful workflows
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-background shadow-sm">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none border-0"
              onClick={() => setViewMode('list')}
              title="List View"
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none border-0"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <UsageBadge resource="workflows" />
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="shadow-sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <FeatureGate resource="workflows">
            <Link to="/workflows/builder">
              <Button className="shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </Link>
          </FeatureGate>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <ErrorBanner message="Failed to load workflows" retry={refetch} />
      ) : (
        <>
      {/* Search Bar */}
      {workflows.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips Banner */}
      {workflows.length === 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <WorkflowIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg mb-2">Welcome to Workflows! 🚀</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Workflows help you automate repetitive tasks and scale your business. Here are some ideas to get started:
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Auto-email new leads within minutes</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Create tasks when lead status changes</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Send reminders for inactive leads</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary bg-primary/5 dark:bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Workflows</CardTitle>
            <div className="p-2.5 bg-primary rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-success">{stats.activeWorkflows} active</span>, {stats.inactiveWorkflows} paused
            </p>
            <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${calcRate(stats.activeWorkflows, stats.totalWorkflows, 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-success bg-success/5 dark:bg-success/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
            <div className="p-2.5 bg-success rounded-xl shadow-md">
              <Play className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-success font-semibold mt-1">All time runs</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-success bg-success/5 dark:bg-success/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <div className="p-2.5 bg-success rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{formatRate(stats.successRate, 1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold">{stats.successfulExecutions}</span> / {stats.totalExecutions} successful
            </p>
            <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-success transition-all duration-500 rounded-full"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Executions</CardTitle>
            <div className="p-2.5 bg-destructive rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.failedExecutions}</div>
            <p className="text-xs font-semibold mt-1 flex items-center gap-1">
              {stats.failedExecutions > 0 ? (
                <span className="text-destructive">⚠️ Need attention</span>
              ) : (
                <span className="text-success">✨ All good!</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List/Grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-12 bg-muted/50">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <WorkflowIcon className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-lg font-semibold leading-tight mb-3">No workflows yet</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Create your first workflow to automate repetitive tasks and scale your business
            </p>
            
            {/* Quick Start Options */}
            <div className="grid gap-4 md:grid-cols-2 w-full mb-8">
              <Link to="/workflows/builder" className="block">
                <div className="p-4 bg-card rounded-lg border text-left hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Start from Scratch</h3>
                  <p className="text-xs text-muted-foreground">Build a custom workflow tailored to your needs</p>
                </div>
              </Link>

              <Link to="/workflows/builder?templates=true" className="block">
                <div className="p-4 bg-card rounded-lg border text-left hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mb-3">
                    <ChevronRight className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-semibold mb-1">Start from a Template</h3>
                  <p className="text-xs text-muted-foreground">Choose from pre-built workflow templates</p>
                </div>
              </Link>
            </div>
            
            <Link to="/workflows/builder">
              <Button size="lg" className="shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Workflow
              </Button>
            </Link>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`p-3 rounded-xl shadow-lg ${
                        workflow.isActive
                          ? 'bg-success text-white'
                          : 'bg-muted-foreground text-white'
                      }`}
                    >
                      <WorkflowIcon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h2 className="text-lg font-semibold leading-tight">{workflow.name}</h2>
                        <Badge
                          variant={workflow.isActive ? 'success' : 'secondary'}
                        >
                          {workflow.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {workflow.description || 'No description'}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Starts When</p>
                          <p className="text-sm font-medium capitalize">
                            {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Actions</p>
                          <p className="text-sm font-medium">
                            {getActionsList(workflow.actions).length} steps
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Executions</p>
                          <p className="text-sm font-medium">{workflow.executions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Run</p>
                          <p className="text-sm font-medium">
                            {workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Workflow Flow Preview */}
                      {getActionsList(workflow.actions).length > 0 && (
                        <div className="py-3 px-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-primary capitalize px-2.5 py-1 bg-white/60 dark:bg-gray-800/60 rounded-md shadow-sm">
                              When {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            {getActionsList(workflow.actions).map((action, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-primary/60" />
                                <span className="text-foreground capitalize font-medium px-2.5 py-1 bg-white/40 dark:bg-gray-800/40 rounded-md shadow-sm">
                                  {action.type?.replace(/_/g, ' ').toLowerCase() || 'then action'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-2">
                        {workflow.isActive ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleWorkflowStatus(workflow.id)}
                            className="shadow-sm hover:shadow-md transition-shadow"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleWorkflowStatus(workflow.id)}
                            className="shadow-sm hover:shadow-md transition-shadow border-success/20 text-success hover:bg-success/5"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </Button>
                        )}
                        <Link to={`/workflows/builder?id=${workflow.id}`}>
                          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewAnalytics(workflow.id)}
                          className="hover:bg-primary/5 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteWorkflow(workflow.id)}
                          disabled={workflow.isActive}
                          title={workflow.isActive ? 'Pause workflow before deleting' : 'Delete workflow'}
                          aria-label={`Delete ${workflow.name}`}
                          className="hover:bg-destructive/5 hover:text-destructive disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-3 rounded-xl shadow-lg ${
                        workflow.isActive
                          ? 'bg-success text-white'
                          : 'bg-muted-foreground text-white'
                      }`}
                    >
                      <WorkflowIcon className="h-6 w-6" />
                    </div>
                    <Badge 
                      variant={workflow.isActive ? 'success' : 'secondary'}
                      className="shadow-sm"
                    >
                      {workflow.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold leading-tight mb-1">{workflow.name}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Starts When</p>
                      <p className="font-medium truncate capitalize">
                        {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actions</p>
                      <p className="font-medium">
                        {getActionsList(workflow.actions).length} steps
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Executions</p>
                      <p className="font-medium">{workflow.executions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Run</p>
                      <p className="font-medium">
                        {workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Workflow Flow Preview */}
                  {getActionsList(workflow.actions).length > 0 && (
                    <div className="py-2 px-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-md border border-primary/20">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-semibold text-primary whitespace-nowrap capitalize">
                          {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        {getActionsList(workflow.actions).map((action, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <ChevronRight className="h-3 w-3 text-primary/60 flex-shrink-0" />
                            <span className="text-foreground whitespace-nowrap capitalize">
                              {action.type?.replace(/_/g, ' ').toLowerCase() || 'action'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex gap-2">
                      {workflow.isActive ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Link to={`/workflows/builder?id=${workflow.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewAnalytics(workflow.id)}
                        aria-label={`View analytics for ${workflow.name}`}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteWorkflow(workflow.id)}
                        disabled={workflow.isActive}
                        title={workflow.isActive ? 'Pause workflow before deleting' : 'Delete workflow'}
                        aria-label={`Delete ${workflow.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {/* Analytics Modal */}
      <Dialog open={!!analyticsWorkflow} onOpenChange={() => setAnalyticsWorkflow(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {analyticsWorkflow?.name} - Analytics
              </span>
            </DialogTitle>
            <DialogDescription>
              Workflow execution metrics and performance data
            </DialogDescription>
          </DialogHeader>
          
          {analyticsWorkflow && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsWorkflow.executions || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsWorkflow.successRate !== null 
                        ? `${formatRate(analyticsWorkflow.successRate, 1)}%` 
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsWorkflow.successRate !== null && analyticsWorkflow.successRate >= 95 
                        ? 'Excellent' 
                        : analyticsWorkflow.successRate !== null && analyticsWorkflow.successRate >= 80
                        ? 'Good'
                        : 'Needs attention'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsWorkflow.isActive ? (
                        <Badge className="bg-success/10 text-success">Active</Badge>
                      ) : (
                        <Badge className="bg-muted text-foreground">Paused</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsWorkflow.isActive ? 'Running automatically' : 'Not executing'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Run</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold">
                      {analyticsWorkflow.lastRunAt 
                        ? new Date(analyticsWorkflow.lastRunAt).toLocaleDateString()
                        : 'Never'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analyticsWorkflow.lastRunAt 
                        ? new Date(analyticsWorkflow.lastRunAt).toLocaleTimeString()
                        : 'Not executed yet'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Starts When</p>
                    <Badge variant="outline" className="capitalize">
                      {analyticsWorkflow.triggerType?.replace(/_/g, ' ').toLowerCase() || 'Not configured'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Number of Actions</p>
                    <p className="text-sm text-muted-foreground">
                      {getActionsList(analyticsWorkflow.actions).length} action(s) configured
                    </p>
                  </div>
                  {analyticsWorkflow.description && (
                    <div>
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{analyticsWorkflow.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-1">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(analyticsWorkflow.createdAt).toLocaleDateString()} at {new Date(analyticsWorkflow.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Executions */}
              {analyticsWorkflow.workflowExecutions && analyticsWorkflow.workflowExecutions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Executions</CardTitle>
                    <CardDescription>Latest workflow runs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsWorkflow.workflowExecutions.slice(0, 5).map((execution) => (
                        <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={execution.status === 'SUCCESS' ? 'default' : execution.status === 'FAILED' ? 'destructive' : 'secondary'}>
                              {execution.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(execution.startedAt).toLocaleString()}
                            </span>
                          </div>
                          {execution.completedAt && (
                            <span className="text-xs text-muted-foreground">
                              Duration: {Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAnalyticsWorkflow(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setAnalyticsWorkflow(null);
                  navigate(`/workflows/builder?id=${analyticsWorkflow.id}`);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Workflow
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowsList;
