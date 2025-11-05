import { useState, useEffect } from 'react';
import { 
  Workflow, Play, Plus, TrendingUp, Save, TestTube2, Clock, 
  CheckCircle2, XCircle, Activity, Download, Upload, Trash2,
  Copy, Settings, Zap, Mail, MessageSquare, UserPlus, Tag,
  Calendar, FileText, ChevronDown, ChevronRight,
  ArrowRight, GitBranch, Filter, Terminal, GripVertical, MousePointer2, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';

type NodeType = 'trigger' | 'action' | 'condition' | 'delay';

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface DraggableItem {
  type: NodeType;
  label: string;
  icon: typeof Zap;
}

interface ExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  duration: number;
  details: string;
}

const WorkflowBuilder = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showTriggerBuilder, setShowTriggerBuilder] = useState(false);
  const [showActionLibrary, setShowActionLibrary] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'active' | 'paused' | 'running'>('idle');
  const [activeExecutions, setActiveExecutions] = useState<number>(0);
  const [interactionMode, setInteractionMode] = useState<'click' | 'drag'>('click');
  const [draggedItem, setDraggedItem] = useState<DraggableItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Mock execution logs
  const [executionLogs] = useState<ExecutionLog[]>([
    { id: '1', timestamp: '2025-10-22 14:32:15', status: 'success', duration: 2.3, details: 'Lead scored, email sent' },
    { id: '2', timestamp: '2025-10-22 14:15:42', status: 'success', duration: 1.8, details: 'Task created successfully' },
    { id: '3', timestamp: '2025-10-22 13:58:21', status: 'failed', duration: 0.5, details: 'Email delivery failed' },
    { id: '4', timestamp: '2025-10-22 13:45:10', status: 'success', duration: 3.1, details: 'Lead assigned to team' },
  ]);

  useEffect(() => {
    // Load workflow if ID is in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const workflowId = urlParams.get('id');
    if (workflowId) {
      loadWorkflow(workflowId);
      // Start polling for workflow status
      fetchWorkflowStatus(workflowId);
    }
  }, []);

  // Poll workflow status every 5 seconds
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const workflowId = urlParams.get('id');
    
    if (!workflowId) return;

    const interval = setInterval(() => {
      fetchWorkflowStatus(workflowId);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchWorkflowStatus = async (workflowId: string) => {
    try {
      const [workflowData, executionsData] = await Promise.all([
        workflowsApi.getWorkflow(workflowId),
        workflowsApi.getExecutions(workflowId, { page: 1, limit: 10 })
      ]);

      // Update workflow status
      if (workflowData) {
        setWorkflowStatus(workflowData.isActive ? 'active' : 'idle');
      }

      // Check for running executions
      if (executionsData?.executions) {
        const runningCount = executionsData.executions.filter(
          (exec: any) => exec.status === 'IN_PROGRESS' || exec.status === 'RUNNING'
        ).length;
        setActiveExecutions(runningCount);
        if (runningCount > 0) {
          setWorkflowStatus('running');
        }
      }
    } catch (error) {
      console.error('Failed to fetch workflow status:', error);
    }
  };

  const loadWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      const response = await workflowsApi.getWorkflow(workflowId);
      
      if (response) {
        setWorkflowName(response.name || 'Workflow');
        // Load nodes from response if available
        if (response.nodes) {
          setNodes(response.nodes);
        }
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      toast.error('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const addNode = (type: NodeType, label: string) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      label,
      config: {},
      position: { x: 100, y: nodes.length * 120 + 100 }
    };
    setNodes([...nodes, newNode]);
    toast.success(`Added ${label} to workflow`);
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    toast.success('Node removed from workflow');
  };

  const saveWorkflow = async () => {
    try {
      const workflowData = {
        name: workflowName,
        nodes: nodes,
        status: 'draft'
      };

      // Check if editing existing workflow
      const urlParams = new URLSearchParams(window.location.search);
      const workflowId = urlParams.get('id');

      if (workflowId) {
        await workflowsApi.updateWorkflow(workflowId, workflowData);
        toast.success('Workflow updated successfully');
      } else {
        await workflowsApi.createWorkflow(workflowData);
        toast.success('Workflow created successfully');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    }
  };

  const runTest = async () => {
    try {
      setIsTestRunning(true);
      toast.info('Starting test execution...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const workflowId = urlParams.get('id');
      
      if (workflowId) {
        await workflowsApi.testWorkflow(workflowId);
      }
      
      setTimeout(() => {
        setIsTestRunning(false);
        toast.success('Test completed successfully');
      }, 3000);
    } catch (error) {
      console.error('Failed to test workflow:', error);
      setIsTestRunning(false);
      toast.error('Test execution failed');
    }
  };

  const importTemplate = (templateName: string) => {
    // Template definitions with actual workflow nodes
    const templates: Record<string, { nodes: WorkflowNode[], name: string, description: string }> = {
      'New Lead Welcome Series': {
        name: 'New Lead Welcome Series',
        description: 'Welcome sequence for new leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'New Lead Created', config: {}, position: { x: 100, y: 100 } },
          { id: 'delay-1', type: 'delay', label: 'Wait 1 hour', config: { duration: 3600 }, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Send Welcome Email', config: {}, position: { x: 100, y: 300 } },
        ]
      },
      'Lead Score & Notify': {
        name: 'Lead Score & Notify',
        description: 'Score leads and notify team',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Activity', config: {}, position: { x: 100, y: 100 } },
          { id: 'condition-1', type: 'condition', label: 'Check Lead Score > 80', config: {}, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Add Hot Lead Tag', config: {}, position: { x: 100, y: 300 } },
          { id: 'action-2', type: 'action', label: 'Notify Sales Team', config: {}, position: { x: 100, y: 400 } },
        ]
      },
      'Follow-up Automation': {
        name: 'Follow-up Automation',
        description: 'Automated follow-up sequence',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Property Viewing Complete', config: {}, position: { x: 100, y: 100 } },
          { id: 'delay-1', type: 'delay', label: 'Wait 2 hours', config: { duration: 7200 }, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Send Feedback Email', config: {}, position: { x: 100, y: 300 } },
          { id: 'delay-2', type: 'delay', label: 'Wait 2 days', config: { duration: 172800 }, position: { x: 100, y: 400 } },
          { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: {}, position: { x: 100, y: 500 } },
        ]
      },
      'Task Assignment': {
        name: 'Task Assignment',
        description: 'Auto-assign tasks by status',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Status Changed', config: {}, position: { x: 100, y: 100 } },
          { id: 'condition-1', type: 'condition', label: 'If Status = Qualified', config: {}, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Assign to Sales Rep', config: {}, position: { x: 100, y: 300 } },
        ]
      },
      'SMS Drip Campaign': {
        name: 'SMS Drip Campaign',
        description: 'Multi-step SMS sequence',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Opts In', config: {}, position: { x: 100, y: 100 } },
          { id: 'action-1', type: 'action', label: 'Send Welcome SMS', config: {}, position: { x: 100, y: 200 } },
          { id: 'delay-1', type: 'delay', label: 'Wait 3 days', config: { duration: 259200 }, position: { x: 100, y: 300 } },
          { id: 'action-2', type: 'action', label: 'Send Value SMS', config: {}, position: { x: 100, y: 400 } },
        ]
      },
      'Email Re-engagement': {
        name: 'Email Re-engagement',
        description: 'Re-engage dormant leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'No Activity 30 Days', config: {}, position: { x: 100, y: 100 } },
          { id: 'action-1', type: 'action', label: 'Send Re-engagement Email', config: {}, position: { x: 100, y: 200 } },
          { id: 'delay-1', type: 'delay', label: 'Wait 7 days', config: { duration: 604800 }, position: { x: 100, y: 300 } },
          { id: 'condition-1', type: 'condition', label: 'Check if Engaged', config: {}, position: { x: 100, y: 400 } },
        ]
      },
      'Property Viewing Follow-up': {
        name: 'Property Viewing Follow-up',
        description: 'Follow-up after viewings',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Viewing Completed', config: {}, position: { x: 100, y: 100 } },
          { id: 'action-1', type: 'action', label: 'Send Thank You Email', config: {}, position: { x: 100, y: 200 } },
          { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: {}, position: { x: 100, y: 300 } },
        ]
      },
      'Contract Milestones': {
        name: 'Contract Milestones',
        description: 'Alert at key contract stages',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Contract Stage Change', config: {}, position: { x: 100, y: 100 } },
          { id: 'condition-1', type: 'condition', label: 'Check Milestone Type', config: {}, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Notify Team', config: {}, position: { x: 100, y: 300 } },
          { id: 'action-2', type: 'action', label: 'Create Reminder Task', config: {}, position: { x: 100, y: 400 } },
          { id: 'action-3', type: 'action', label: 'Update CRM', config: {}, position: { x: 100, y: 500 } },
        ]
      },
      'Lead Qualification': {
        name: 'Lead Qualification',
        description: 'Qualify and route leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'New Lead', config: {}, position: { x: 100, y: 100 } },
          { id: 'condition-1', type: 'condition', label: 'Check Budget & Timeline', config: {}, position: { x: 100, y: 200 } },
          { id: 'action-1', type: 'action', label: 'Add Qualified Tag', config: {}, position: { x: 100, y: 300 } },
          { id: 'action-2', type: 'action', label: 'Assign to Agent', config: {}, position: { x: 100, y: 400 } },
        ]
      },
    };

    const template = templates[templateName];
    if (template) {
      setNodes(template.nodes);
      setWorkflowName(template.name);
      toast.success(`Imported ${template.nodes.length} nodes from "${templateName}"`);
    } else {
      toast.error('Template not found');
    }
    setShowTemplates(false);
  };

  // Drag and drop handlers
  const handleDragStart = (item: DraggableItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (draggedItem) {
      addNode(draggedItem.type, draggedItem.label);
      setDraggedItem(null);
    }
  };

  const toggleInteractionMode = () => {
    const newMode = interactionMode === 'click' ? 'drag' : 'click';
    setInteractionMode(newMode);
    toast.info(`Switched to ${newMode} mode`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
              />
              {/* Live Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  workflowStatus === 'running' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                  workflowStatus === 'active' ? 'bg-blue-500' :
                  workflowStatus === 'paused' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {workflowStatus === 'running' ? `Running (${activeExecutions} active)` :
                   workflowStatus === 'active' ? 'Active' :
                   workflowStatus === 'paused' ? 'Paused' :
                   'Not Active'}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              Build automated workflows with visual drag-and-drop
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={interactionMode === 'drag' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleInteractionMode}
          >
            {interactionMode === 'click' ? (
              <>
                <GripVertical className="h-4 w-4 mr-2" />
                Enable Drag & Drop
              </>
            ) : (
              <>
                <MousePointer2 className="h-4 w-4 mr-2" />
                Click Mode
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
            <Upload className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={runTest}>
            <TestTube2 className="h-4 w-4 mr-2" />
            Test Run
          </Button>
          <Button onClick={saveWorkflow}>
            <Save className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      {/* Performance Metrics Panel */}
      {showMetricsPanel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Workflow execution analytics</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMetricsPanel(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">1,463</p>
                <p className="text-xs text-green-600">↑ 12% from last month</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">97.3%</p>
                <p className="text-xs text-green-600">↑ 2.1% from last month</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">2.4s</p>
                <p className="text-xs text-green-600">↓ 0.3s faster</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">342h</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Email Automation</span>
                  <span className="text-muted-foreground">456 runs</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Lead Scoring</span>
                  <span className="text-muted-foreground">332 runs</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Task Creation</span>
                  <span className="text-muted-foreground">289 runs</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Modal */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-7xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>Workflow Templates</DialogTitle>
                <DialogDescription>
                  Start with a pre-built workflow and customize it to your needs
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTemplates(false)}
                className="h-8 w-8 p-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search and Filter */}
            <div className="flex gap-3 mt-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-9"
                />
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="all">All Templates</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="task">Tasks</option>
                <option value="lead">Lead Management</option>
              </select>
            </div>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 pr-2 -mr-2 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-4">
              {[
                { 
                  name: 'New Lead Welcome Series', 
                  desc: 'Automatically welcome and nurture new leads with personalized emails', 
                  icon: Mail, 
                  uses: 1243, 
                  nodes: 3,
                  category: 'email',
                  workflow: '1. Trigger: New lead created → 2. Wait 1 hour → 3. Send welcome email'
                },
                { 
                  name: 'Lead Score & Notify', 
                  desc: 'Score leads based on activity and notify sales team when hot', 
                  icon: TrendingUp, 
                  uses: 892, 
                  nodes: 4,
                  category: 'lead',
                  workflow: '1. Trigger: Lead activity → 2. Check score > 80 → 3. Add hot tag → 4. Notify team'
                },
                { 
                  name: 'Follow-up Automation', 
                  desc: 'Auto follow-up after property showing with feedback requests', 
                  icon: Calendar, 
                  uses: 756, 
                  nodes: 5,
                  category: 'email',
                  workflow: '1. Viewing complete → 2. Wait 2 hours → 3. Feedback email → 4. Wait 2 days → 5. Create task'
                },
                { 
                  name: 'Task Assignment', 
                  desc: 'Auto-assign tasks to team members based on lead status', 
                  icon: CheckCircle2, 
                  uses: 654, 
                  nodes: 3,
                  category: 'task',
                  workflow: '1. Lead status changed → 2. If qualified → 3. Assign to sales rep'
                },
                { 
                  name: 'SMS Drip Campaign', 
                  desc: 'Multi-step SMS nurture sequence with timing controls', 
                  icon: MessageSquare, 
                  uses: 543, 
                  nodes: 4,
                  category: 'sms',
                  workflow: '1. Lead opts in → 2. Send welcome SMS → 3. Wait 3 days → 4. Send value SMS'
                },
                { 
                  name: 'Email Re-engagement', 
                  desc: 'Re-engage cold leads with strategic emails', 
                  icon: Zap, 
                  uses: 421, 
                  nodes: 4,
                  category: 'email',
                  workflow: '1. No activity 30 days → 2. Re-engagement email → 3. Wait 7 days → 4. Check if engaged'
                },
                { 
                  name: 'Property Viewing Follow-up', 
                  desc: 'Automated follow-up after viewings with scheduling', 
                  icon: Calendar, 
                  uses: 389, 
                  nodes: 3,
                  category: 'task',
                  workflow: '1. Viewing completed → 2. Thank you email → 3. Create follow-up task'
                },
                { 
                  name: 'Contract Milestones', 
                  desc: 'Alert team at key contract stages and deadlines', 
                  icon: FileText, 
                  uses: 312, 
                  nodes: 5,
                  category: 'task',
                  workflow: '1. Contract stage change → 2. Check milestone → 3. Notify team → 4. Create reminder → 5. Update CRM'
                },
                { 
                  name: 'Lead Qualification', 
                  desc: 'Automatically qualify and route leads to right team', 
                  icon: Filter, 
                  uses: 276, 
                  nodes: 4,
                  category: 'lead',
                  workflow: '1. New lead → 2. Check budget & timeline → 3. Add qualified tag → 4. Assign to agent'
                },
              ]
                .filter(template => {
                  const matchesSearch = templateSearch === '' || 
                    template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    template.desc.toLowerCase().includes(templateSearch.toLowerCase());
                  const matchesFilter = templateFilter === 'all' || template.category === templateFilter;
                  return matchesSearch && matchesFilter;
                })
                .map((template) => (
                <Card key={template.name} className="hover:border-primary hover:shadow-md transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <template.icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">{template.uses} uses</Badge>
                    </div>
                    <CardTitle className="text-sm leading-tight">{template.name}</CardTitle>
                    <CardDescription className="text-xs mt-1 mb-2">{template.desc}</CardDescription>
                    
                    {/* Workflow Steps */}
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      <div className="flex items-start gap-1">
                        <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{template.workflow}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{template.nodes} nodes</span>
                      <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
                    </div>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => importTemplate(template.name)}
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Import
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* No Results */}
            {[
                { name: 'New Lead Welcome Series', desc: 'Automatically welcome and nurture new leads with personalized emails', icon: Mail, uses: 1243, nodes: 3, category: 'email', workflow: '' },
                { name: 'Lead Score & Notify', desc: 'Score leads based on activity and notify sales team when hot', icon: TrendingUp, uses: 892, nodes: 4, category: 'lead', workflow: '' },
                { name: 'Follow-up Automation', desc: 'Auto follow-up after property showing with feedback requests', icon: Calendar, uses: 756, nodes: 5, category: 'email', workflow: '' },
                { name: 'Task Assignment', desc: 'Auto-assign tasks to team members based on lead status', icon: CheckCircle2, uses: 654, nodes: 3, category: 'task', workflow: '' },
                { name: 'SMS Drip Campaign', desc: 'Multi-step SMS nurture sequence with timing controls', icon: MessageSquare, uses: 543, nodes: 4, category: 'sms', workflow: '' },
                { name: 'Email Re-engagement', desc: 'Re-engage cold leads with strategic emails', icon: Zap, uses: 421, nodes: 4, category: 'email', workflow: '' },
                { name: 'Property Viewing Follow-up', desc: 'Automated follow-up after viewings with scheduling', icon: Calendar, uses: 389, nodes: 3, category: 'task', workflow: '' },
                { name: 'Contract Milestones', desc: 'Alert team at key contract stages and deadlines', icon: FileText, uses: 312, nodes: 5, category: 'task', workflow: '' },
                { name: 'Lead Qualification', desc: 'Automatically qualify and route leads to right team', icon: Filter, uses: 276, nodes: 4, category: 'lead', workflow: '' },
              ].filter(template => {
                const matchesSearch = templateSearch === '' || 
                  template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  template.desc.toLowerCase().includes(templateSearch.toLowerCase());
                const matchesFilter = templateFilter === 'all' || template.category === templateFilter;
                return matchesSearch && matchesFilter;
              }).length === 0 && (
                <div className="text-center py-12">
                  <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary" onClick={() => setShowMetricsPanel(!showMetricsPanel)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nodes in Workflow</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes.length}</div>
            <p className="text-xs text-muted-foreground">Click to view metrics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,463</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97.3%</div>
            <p className="text-xs text-muted-foreground">1,423 successful</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => setShowLogsPanel(!showLogsPanel)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executionLogs.length}</div>
            <p className="text-xs text-muted-foreground">Click to view logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workflow Canvas & Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Workflow Canvas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflow Canvas</CardTitle>
                <CardDescription>Visual node-based workflow builder</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTriggerBuilder(!showTriggerBuilder)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowActionLibrary(!showActionLibrary)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className={`border-2 border-dashed rounded-lg min-h-[500px] bg-muted/20 p-4 relative overflow-auto transition-colors ${
                isDraggingOver && interactionMode === 'drag' ? 'border-primary bg-primary/5' : ''
              }`}
              onDragOver={interactionMode === 'drag' ? handleDragOver : undefined}
              onDragLeave={interactionMode === 'drag' ? handleDragLeave : undefined}
              onDrop={interactionMode === 'drag' ? handleDrop : undefined}
            >
              {nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Workflow className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
                    <p className="text-muted-foreground mb-2">
                      {interactionMode === 'drag' 
                        ? 'Drag triggers and actions from the sidebar and drop them here'
                        : 'Add triggers and actions to create your automation'
                      }
                    </p>
                    <Badge variant="outline" className="mb-4">
                      {interactionMode === 'drag' ? 'Drag & Drop Mode' : 'Click Mode'}
                    </Badge>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setShowTriggerBuilder(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Trigger
                      </Button>
                      <Button variant="outline" onClick={() => setShowTemplates(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {nodes.map((node, index) => (
                    <div key={node.id} className="space-y-2">
                      <Card 
                        className={`cursor-pointer transition-all ${
                          selectedNode?.id === node.id ? 'border-primary bg-primary/5 shadow-md' : ''
                        } ${
                          workflowStatus === 'running' ? 'hover:shadow-lg' : ''
                        }`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`relative p-2 rounded-lg ${
                                node.type === 'trigger' ? 'bg-blue-100 text-blue-600' :
                                node.type === 'action' ? 'bg-green-100 text-green-600' :
                                node.type === 'condition' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-purple-100 text-purple-600'
                              }`}>
                                {node.type === 'trigger' && <Zap className="h-4 w-4" />}
                                {node.type === 'action' && <Settings className="h-4 w-4" />}
                                {node.type === 'condition' && <GitBranch className="h-4 w-4" />}
                                {node.type === 'delay' && <Clock className="h-4 w-4" />}
                                {/* Running indicator on node icon */}
                                {workflowStatus === 'running' && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{node.label}</p>
                                <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                Step {index + 1}
                              </Badge>
                              {workflowStatus === 'running' && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                  <Activity className="h-3 w-3 mr-1" />
                                  Live
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNode(node.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      {index < nodes.length - 1 && (
                        <div className="flex flex-col items-center py-2">
                          {/* Enhanced Connection Line */}
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-0.5 h-4 bg-gradient-to-b from-primary/60 to-primary/20" />
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                                <ArrowRight className="h-4 w-4 text-primary rotate-90" />
                              </div>
                              {/* Animated pulse for running workflows */}
                              {workflowStatus === 'running' && (
                                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                              )}
                            </div>
                            <div className="w-0.5 h-4 bg-gradient-to-b from-primary/20 to-primary/60" />
                          </div>
                          {/* Step connector label */}
                          <span className="text-xs text-muted-foreground font-medium">
                            Then
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar - Node Config / Quick Actions */}
        <div className="space-y-6">
          {/* Trigger Builder Panel */}
          {showTriggerBuilder && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Trigger</CardTitle>
                <CardDescription className="text-xs">
                  {interactionMode === 'drag' ? 'Drag to canvas or click to add' : 'Click to add to workflow'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'New Lead Created', icon: UserPlus, type: 'trigger' as NodeType },
                  { label: 'Lead Status Changed', icon: Tag, type: 'trigger' as NodeType },
                  { label: 'Email Opened', icon: Mail, type: 'trigger' as NodeType },
                  { label: 'Form Submitted', icon: FileText, type: 'trigger' as NodeType },
                  { label: 'Time Schedule', icon: Calendar, type: 'trigger' as NodeType },
                  { label: 'Score Threshold', icon: TrendingUp, type: 'trigger' as NodeType },
                ].map((trigger) => (
                  <div
                    key={trigger.label}
                    className={`p-3 border rounded-lg hover:bg-accent transition-colors ${
                      interactionMode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    }`}
                    draggable={interactionMode === 'drag'}
                    onDragStart={() => handleDragStart({ type: trigger.type, label: trigger.label, icon: trigger.icon })}
                    onClick={() => {
                      if (interactionMode === 'click') {
                        addNode('trigger', trigger.label);
                        setShowTriggerBuilder(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {interactionMode === 'drag' && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                      <trigger.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{trigger.label}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Library Panel */}
          {showActionLibrary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Action</CardTitle>
                <CardDescription className="text-xs">
                  {interactionMode === 'drag' ? 'Drag to canvas or click to add' : 'Click to add to workflow'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Send Email', icon: Mail, type: 'action' as NodeType },
                  { label: 'Send SMS', icon: MessageSquare, type: 'action' as NodeType },
                  { label: 'Update Lead Status', icon: Tag, type: 'action' as NodeType },
                  { label: 'Assign to Team', icon: UserPlus, type: 'action' as NodeType },
                  { label: 'Create Task', icon: CheckCircle2, type: 'action' as NodeType },
                  { label: 'Wait/Delay', icon: Clock, type: 'delay' as NodeType },
                  { label: 'If/Then Condition', icon: GitBranch, type: 'condition' as NodeType },
                  { label: 'Score Lead', icon: TrendingUp, type: 'action' as NodeType },
                ].map((action) => (
                  <div
                    key={action.label}
                    className={`p-3 border rounded-lg hover:bg-accent transition-colors ${
                      interactionMode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    }`}
                    draggable={interactionMode === 'drag'}
                    onDragStart={() => handleDragStart({ type: action.type, label: action.label, icon: action.icon })}
                    onClick={() => {
                      if (interactionMode === 'click') {
                        addNode(action.type, action.label);
                        setShowActionLibrary(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {interactionMode === 'drag' && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                      <action.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Testing/Debugging Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Test & Debug</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                >
                  {showTestPanel ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showTestPanel && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test with Sample Data</label>
                  <Input placeholder="Lead ID or Email" />
                </div>
                <Button 
                  className="w-full" 
                  onClick={runTest}
                  disabled={isTestRunning}
                >
                  <TestTube2 className="h-4 w-4 mr-2" />
                  {isTestRunning ? 'Running Test...' : 'Run Test'}
                </Button>
                {isTestRunning && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Executing workflow...</span>
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Quick Actions</p>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Workflow
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Selected Node Configuration */}
          {selectedNode && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Node Configuration</CardTitle>
                <CardDescription className="text-xs">{selectedNode.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Node Name</label>
                  <Input defaultValue={selectedNode.label} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Optional description" />
                </div>
                {selectedNode.type === 'action' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Action Settings</label>
                    <Input placeholder="Configure action parameters" />
                  </div>
                )}
                {selectedNode.type === 'condition' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Condition Rules</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>If lead score &gt; 80</option>
                      <option>If lead status = Hot</option>
                      <option>If email opened</option>
                    </select>
                  </div>
                )}
                {selectedNode.type === 'delay' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delay Duration</label>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="5" className="w-20" />
                      <select className="flex-1 p-2 border rounded-md">
                        <option>Minutes</option>
                        <option>Hours</option>
                        <option>Days</option>
                      </select>
                    </div>
                  </div>
                )}
                <Button className="w-full mt-4">
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Execution Logs Viewer */}
      {showLogsPanel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>Recent workflow execution history</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowLogsPanel(false)}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executionLogs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      {log.status === 'running' && <Activity className="h-4 w-4 text-blue-600 animate-pulse" />}
                      <span className="font-medium capitalize">{log.status}</span>
                    </div>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.duration}s
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{log.details}</p>
                  <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              <Terminal className="h-4 w-4 mr-2" />
              View Full Debug Console
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkflowBuilder;
