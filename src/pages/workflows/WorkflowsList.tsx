import { useState, useEffect } from 'react';
import { Workflow as WorkflowIcon, Plus, Play, Pause, Edit, Trash2, BarChart3, RefreshCw, LayoutGrid, LayoutList, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerData: any;
  actions: any[];
  executions: number;
  successRate: number | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  workflowExecutions?: any[];
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [analyticsWorkflow, setAnalyticsWorkflow] = useState<Workflow | null>(null);
  const [stats, setStats] = useState<WorkflowStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    inactiveWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load workflows and stats in parallel
      const [workflowsResponse, statsResponse] = await Promise.all([
        workflowsApi.getWorkflows(),
        workflowsApi.getStats(),
      ]);
      
      if (workflowsResponse?.data?.workflows) {
        setWorkflows(workflowsResponse.data.workflows);
      }

      if (statsResponse?.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
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
      await loadData(true);
    } catch (error: unknown) {
      console.error('Failed to toggle workflow:', error);
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to toggle workflow status';
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

    if (!window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      await workflowsApi.deleteWorkflow(workflowId);
      toast.success('Workflow deleted successfully');
      await loadData(true);
    } catch (error: unknown) {
      console.error('Failed to delete workflow:', error);
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to delete workflow';
      toast.error(errorMessage);
    }
  };

  const viewAnalytics = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setAnalyticsWorkflow(workflow);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with helpful tips */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <WorkflowIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automate your marketing and sales processes with powerful workflows
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 bg-background shadow-sm">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none border-0"
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none border-0"
              onClick={() => setViewMode('grid')}
              title="Grid View"
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
              <Button className="shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </Link>
          </FeatureGate>
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        </Card>
      ) : (
        <>
      {/* Quick Tips Banner */}
      {workflows.length === 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <WorkflowIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Welcome to Workflows! 🚀</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Workflows help you automate repetitive tasks and scale your business. Here are some ideas to get started:
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>Auto-email new leads within minutes</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>Create tasks when lead status changes</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
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
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Workflows</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-800 bg-clip-text text-transparent">{stats.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.activeWorkflows} active</span>, {stats.inactiveWorkflows} paused
            </p>
            <div className="mt-3 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full"
                style={{ width: `${stats.totalWorkflows > 0 ? (stats.activeWorkflows / stats.totalWorkflows) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Executions</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
              <Play className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-green-600 to-green-800 bg-clip-text text-transparent">{stats.totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">All time runs</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-emerald-600 to-emerald-800 bg-clip-text text-transparent">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold">{stats.successfulExecutions}</span> / {stats.totalExecutions} successful
            </p>
            <div className="mt-3 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Executions</CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md">
              <WorkflowIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-red-600 to-red-800 bg-clip-text text-transparent">{stats.failedExecutions}</div>
            <p className="text-xs font-semibold mt-1 flex items-center gap-1">
              {stats.failedExecutions > 0 ? (
                <span className="text-red-600 dark:text-red-400">⚠️ Need attention</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">✨ All good!</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List/Grid */}
      {workflows.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <WorkflowIcon className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No workflows yet</h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Create your first workflow to automate repetitive tasks and scale your business
            </p>
            
            {/* Quick Start Options */}
            <div className="grid gap-4 md:grid-cols-3 w-full mb-8">
              <Link to="/workflows/builder" className="block">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border text-left hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold mb-1">Start from Scratch</h4>
                  <p className="text-xs text-muted-foreground">Build a custom workflow tailored to your needs</p>
                </div>
              </Link>
              <Link to="/workflows/automation" className="block">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border text-left hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3">
                    <WorkflowIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold mb-1">Use a Template</h4>
                  <p className="text-xs text-muted-foreground">Choose from pre-built automation rules</p>
                </div>
              </Link>
              <a href="/workflows/builder" className="block">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border text-left hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3">
                    <ChevronRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold mb-1">Follow a Guide</h4>
                  <p className="text-xs text-muted-foreground">Step-by-step workflow creation tutorial</p>
                </div>
              </a>
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
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`p-3 rounded-xl shadow-lg ${
                        workflow.isActive
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}
                    >
                      <WorkflowIcon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold">{workflow.name}</h3>
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
                            {Array.isArray(workflow.actions) ? workflow.actions.length : 0} steps
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Executions</p>
                          <p className="text-sm font-medium">{workflow.executions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="text-sm font-medium">
                            {workflow.successRate !== null ? `${workflow.successRate.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Workflow Flow Preview */}
                      {Array.isArray(workflow.actions) && workflow.actions.length > 0 && (
                        <div className="py-3 px-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-blue-700 dark:text-blue-300 capitalize px-2.5 py-1 bg-white/60 dark:bg-gray-800/60 rounded-md shadow-sm">
                              When {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            {workflow.actions.map((action: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                <span className="text-gray-700 dark:text-gray-300 capitalize font-medium px-2.5 py-1 bg-white/40 dark:bg-gray-800/40 rounded-md shadow-sm">
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
                            className="shadow-sm hover:shadow-md transition-shadow border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
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
                          className="hover:bg-blue-50 dark:hover:bg-blue-950"
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
                          className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
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
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-3 rounded-xl shadow-lg ${
                        workflow.isActive
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
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
                    <h3 className="text-lg font-semibold mb-1">{workflow.name}</h3>
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
                        {Array.isArray(workflow.actions) ? workflow.actions.length : 0} steps
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Executions</p>
                      <p className="font-medium">{workflow.executions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="font-medium">
                        {workflow.successRate !== null ? `${workflow.successRate.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Workflow Flow Preview */}
                  {Array.isArray(workflow.actions) && workflow.actions.length > 0 && (
                    <div className="py-2 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap capitalize">
                          {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        {workflow.actions.map((action: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <ChevronRight className="h-3 w-3 text-blue-400 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap capitalize">
                              {action.type?.replace(/_/g, ' ').toLowerCase() || 'action'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    {workflow.isActive ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => toggleWorkflowStatus(workflow.id)}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => toggleWorkflowStatus(workflow.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Link to={`/workflows/builder?id=${workflow.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewAnalytics(workflow.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteWorkflow(workflow.id)}
                        disabled={workflow.isActive}
                        title={workflow.isActive ? 'Pause workflow before deleting' : 'Delete workflow'}
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
                        ? `${analyticsWorkflow.successRate.toFixed(1)}%` 
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
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Paused</Badge>
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
                      {analyticsWorkflow.actions?.length || 0} action(s) configured
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
                      {analyticsWorkflow.workflowExecutions.slice(0, 5).map((execution: any) => (
                        <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={execution.status === 'COMPLETED' ? 'default' : 'destructive'}>
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
