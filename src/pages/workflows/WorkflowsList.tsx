import { useState, useEffect } from 'react';
import { Workflow, Plus, Play, Pause, Edit, Trash2, BarChart3, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';

const WorkflowsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [workflows, setWorkflows] = useState([
    {
      id: 1,
      name: 'Welcome Email Sequence',
      description: 'Send 3 welcome emails over 5 days to new signups',
      status: 'active' as const,
      triggers: 'New Lead Created',
      actions: 5,
      leads: 234,
      conversionRate: 18.5,
    },
    {
      id: 2,
      name: 'Lead Nurturing Campaign',
      description: 'Automated nurturing sequence for cold leads',
      status: 'active' as const,
      triggers: 'Lead Score < 50',
      actions: 8,
      leads: 567,
      conversionRate: 12.3,
    },
    {
      id: 3,
      name: 'Abandoned Cart Recovery',
      description: 'Follow up with leads who did not complete purchase',
      status: 'active' as const,
      triggers: 'Trial Started, No Purchase',
      actions: 4,
      leads: 128,
      conversionRate: 24.7,
    },
    {
      id: 4,
      name: 'High-Value Lead Alert',
      description: 'Notify sales team when high-value lead detected',
      status: 'active' as const,
      triggers: 'Lead Score > 80',
      actions: 3,
      leads: 89,
      conversionRate: 42.5,
    },
    {
      id: 5,
      name: 'Re-engagement Campaign',
      description: 'Win back inactive customers',
      status: 'paused' as const,
      triggers: 'No Activity for 60 Days',
      actions: 6,
      leads: 445,
      conversionRate: 8.9,
    },
  ]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await workflowsApi.getWorkflows();
      
      if (response && Array.isArray(response)) {
        setWorkflows(response);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows, using sample data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadWorkflows(true);
  };

  const toggleWorkflowStatus = async (workflowId: number) => {
    try {
      await workflowsApi.toggleWorkflow(workflowId.toString());
      
      setWorkflows(workflows.map(w => 
        w.id === workflowId 
          ? { ...w, status: w.status === 'active' ? 'paused' as const : 'active' as const }
          : w
      ));
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        toast.success(`Workflow ${workflow.status === 'active' ? 'paused' : 'activated'}`);
      }
      
      await loadWorkflows(true);
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      toast.error('Failed to toggle workflow status');
    }
  };

  const deleteWorkflow = async (workflowId: number) => {
    try {
      await workflowsApi.deleteWorkflow(workflowId.toString());
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      toast.success('Workflow deleted successfully');
      await loadWorkflows(true);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const viewAnalytics = (workflowId: number) => {
    toast.info(`Analytics for workflow ${workflowId}`);
    // In a real app: navigate(`/workflows/analytics/${workflowId}`);
  };

  const applyTemplate = (templateName: string) => {
    toast.success(`Creating workflow from template: ${templateName}`);
    navigate('/workflows/builder');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Automate your marketing and sales processes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/workflows/builder">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </Link>
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
      <div className="hidden">Wrapper for loading state</div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">9 active, 3 paused</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,463</div>
            <p className="text-xs text-muted-foreground">In workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">19.3%</div>
            <p className="text-xs text-muted-foreground">+3.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-3 rounded-lg ${
                      workflow.status === 'active'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Workflow className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold">{workflow.name}</h3>
                      <Badge
                        variant={workflow.status === 'active' ? 'success' : 'secondary'}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Trigger</p>
                        <p className="text-sm font-medium">{workflow.triggers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actions</p>
                        <p className="text-sm font-medium">{workflow.actions} steps</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Leads Enrolled</p>
                        <p className="text-sm font-medium">{workflow.leads}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Conversion Rate</p>
                        <p className="text-sm font-medium">{workflow.conversionRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {workflow.status === 'active' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </Button>
                      )}
                      <Link to={`/workflows/builder?id=${workflow.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewAnalytics(workflow.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteWorkflow(workflow.id)}
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

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
          <CardDescription>Start with pre-built workflow templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              'Lead Scoring Automation',
              'Meeting Reminder Sequence',
              'Customer Onboarding Flow',
              'Referral Program Automation',
              'Upsell Opportunity Tracker',
              'Churn Prevention Campaign',
            ].map((template, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <h4 className="font-medium mb-2">{template}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Pre-configured workflow ready to use
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => applyTemplate(template)}
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default WorkflowsList;
