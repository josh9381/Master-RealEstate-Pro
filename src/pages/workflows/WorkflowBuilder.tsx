import { useState, useEffect } from 'react';
import { 
  Workflow, Play, Plus, TrendingUp, Save, TestTube2, 
  CheckCircle2, XCircle, Activity, Download, Upload,
  Copy, Zap, Mail, MessageSquare,
  Calendar, FileText, ChevronDown, ChevronRight,
  ArrowRight, Filter, Terminal, GripVertical, MousePointer2, X,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeData } from '@/components/workflows/WorkflowNode';
import { WorkflowComponentLibrary, WorkflowComponent } from '@/components/workflows/WorkflowComponentLibrary';
import { NodeConfigPanel } from '@/components/workflows/NodeConfigPanel';

interface ExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  duration: number;
  details: string;
}

const WorkflowBuilder = () => {
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [nodes, setNodes] = useState<WorkflowNodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeData | null>(null);
  const [showComponentLibrary, setShowComponentLibrary] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'active' | 'paused' | 'running'>('idle');
  const [activeExecutions, setActiveExecutions] = useState<number>(0);
  const [interactionMode, setInteractionMode] = useState<'click' | 'drag'>('drag');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Execution logs - empty until real data flows
  const [executionLogs] = useState<ExecutionLog[]>([]);

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
      const response = await workflowsApi.getWorkflow(workflowId);
      
      if (response?.data?.workflow) {
        const workflow = response.data.workflow;
        setWorkflowName(workflow.name || 'Workflow');
        setWorkflowStatus(workflow.isActive ? 'active' : 'idle');
        
        // Reconstruct nodes from workflow data
        const reconstructedNodes: WorkflowNodeData[] = [];
        
        // Add trigger node
        if (workflow.triggerType) {
          const triggerLabel = workflow.triggerType.replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
            
          reconstructedNodes.push({
            id: 'trigger-node',
            type: 'trigger',
            label: `Trigger: ${triggerLabel}`,
            description: 'Workflow trigger',
            config: {
              triggerType: workflow.triggerType,
              ...(workflow.triggerData || {})
            },
            position: { x: 400, y: 100 } // Set initial position
          });
        }
        
        // Add action nodes with proper spacing
        if (workflow.actions && Array.isArray(workflow.actions)) {
          workflow.actions.forEach((action: any, index: number) => {
            const actionType = action.type || 'action';
            const actionLabel = actionType.replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
            
            reconstructedNodes.push({
              id: action.id || `action-${index}`,
              type: 'action',
              label: actionLabel,
              description: action.description || '',
              config: action.config || {},
              position: { x: 400, y: 100 + ((index + 1) * 180) } // Space nodes 180px apart
            });
          });
        }
        
        setNodes(reconstructedNodes);
        toast.success(`Workflow loaded: ${workflow.name}`);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      toast.error('Failed to load workflow');
    }
  };

  const addNodeFromComponent = (component: WorkflowComponent) => {
    const newNode: WorkflowNodeData = {
      id: `node-${Date.now()}`,
      type: component.type,
      label: component.label,
      description: component.description,
      config: component.config || {}
    };
    setNodes([...nodes, newNode]);
    toast.success(`Added ${component.label} to workflow`);
  };

  const handleComponentSelect = (component: WorkflowComponent) => {
    // Only add when in click mode - in drag mode, components should only be added via drag & drop
    if (interactionMode === 'click') {
      addNodeFromComponent(component);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (interactionMode === 'drag') {
      try {
        const data = e.dataTransfer.getData('application/json');
        if (!data) {
          toast.error('No component data found');
          return;
        }
        const component = JSON.parse(data) as WorkflowComponent;
        addNodeFromComponent(component);
      } catch (error) {
        console.error('Failed to parse dropped component:', error);
        toast.error('Failed to add component');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging if we have valid data
    if (e.dataTransfer.types.includes('application/json')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleComponentDragStart = (_component: WorkflowComponent) => {
    // Optional: Add visual feedback when drag starts
  };

  const handleNodeMove = (nodeId: string, position: { x: number; y: number }) => {
    setNodes(nodes.map(n => 
      n.id === nodeId ? { ...n, position } : n
    ));
  };

  // Validate workflow for common issues
  const validateWorkflow = () => {
    const errors: string[] = [];
    
    // Check for triggers
    const triggers = nodes.filter(n => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger');
    }
    if (triggers.length > 1) {
      errors.push('Workflow should only have one trigger');
    }
    
    // Check for disconnected nodes (basic check)
    if (nodes.length > 1 && !nodes[0] || nodes[0]?.type !== 'trigger') {
      errors.push('Workflow should start with a trigger');
    }
    
    // Check for actions without triggers
    if (nodes.length > 0 && triggers.length === 0) {
      errors.push('Cannot have actions without a trigger');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Auto-arrange nodes in a clean layout
  const autoArrangeNodes = () => {
    if (nodes.length === 0) return;
    
    const arrangedNodes = nodes.map((node, index) => {
      // Simple vertical layout with spacing
      const x = 400; // Center horizontally
      const y = 100 + (index * 180); // Space nodes 180px apart
      
      return {
        ...node,
        position: { x, y }
      };
    });
    
    setNodes(arrangedNodes);
    toast.success('Workflow auto-arranged!');
  };

  // Update validation whenever nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      validateWorkflow();
    } else {
      setValidationErrors([]);
    }
  }, [nodes]);

  const handleNodeSelect = (node: WorkflowNodeData) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
    toast.success('Node removed from workflow');
  };

  const handleNodeEdit = (node: WorkflowNodeData) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const handleConfigSave = (nodeId: string, config: Record<string, unknown>) => {
    setNodes(nodes.map(n => 
      n.id === nodeId ? { ...n, config } : n
    ));
    setShowConfigPanel(false);
    toast.success('Node configuration saved');
  };

  const saveWorkflow = async () => {
    try {
      // Map nodes to the format the backend expects
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const actionNodes = nodes.filter(n => n.type !== 'trigger');

      const workflowData = {
        name: workflowName,
        description: `Workflow with ${nodes.length} nodes`,
        triggerType: triggerNode?.label?.toLowerCase().replace(/\s+/g, '_') || 'manual',
        triggerData: triggerNode?.config || {},
        actions: actionNodes.map(n => ({
          type: n.type,
          config: {
            ...n.config,
            label: n.label
          }
        })),
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
        toast.success('Test completed successfully');
      } else {
        toast.warning('Please save the workflow before testing');
      }
    } catch (error) {
      console.error('Failed to test workflow:', error);
      toast.error('Test execution failed');
    } finally {
      setIsTestRunning(false);
    }
  };

  const importTemplate = (templateName: string) => {
    // Template definitions with actual workflow nodes
    const templates: Record<string, { nodes: WorkflowNodeData[], name: string, description: string }> = {
      'New Lead Welcome Series': {
        name: 'New Lead Welcome Series',
        description: 'Welcome sequence for new leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'New Lead Created', config: {} },
          { id: 'delay-1', type: 'delay', label: 'Wait 1 hour', config: { duration: 3600 } },
          { id: 'action-1', type: 'action', label: 'Send Welcome Email', config: {} },
        ]
      },
      'Lead Score & Notify': {
        name: 'Lead Score & Notify',
        description: 'Score leads and notify team',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Activity', config: {} },
          { id: 'condition-1', type: 'condition', label: 'Check Lead Score > 80', config: {} },
          { id: 'action-1', type: 'action', label: 'Add Hot Lead Tag', config: {} },
          { id: 'action-2', type: 'action', label: 'Notify Sales Team', config: {} },
        ]
      },
      'Follow-up Automation': {
        name: 'Follow-up Automation',
        description: 'Automated follow-up sequence',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Property Viewing Complete', config: {} },
          { id: 'delay-1', type: 'delay', label: 'Wait 2 hours', config: { duration: 7200 } },
          { id: 'action-1', type: 'action', label: 'Send Feedback Email', config: {} },
          { id: 'delay-2', type: 'delay', label: 'Wait 2 days', config: { duration: 172800 } },
          { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: {} },
        ]
      },
      'Task Assignment': {
        name: 'Task Assignment',
        description: 'Auto-assign tasks by status',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Status Changed', config: {} },
          { id: 'condition-1', type: 'condition', label: 'If Status = Qualified', config: {} },
          { id: 'action-1', type: 'action', label: 'Assign to Sales Rep', config: {} },
        ]
      },
      'SMS Drip Campaign': {
        name: 'SMS Drip Campaign',
        description: 'Multi-step SMS sequence',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead Opts In', config: {} },
          { id: 'action-1', type: 'action', label: 'Send Welcome SMS', config: {} },
          { id: 'delay-1', type: 'delay', label: 'Wait 3 days', config: { duration: 259200 } },
          { id: 'action-2', type: 'action', label: 'Send Value SMS', config: {} },
        ]
      },
      'Email Re-engagement': {
        name: 'Email Re-engagement',
        description: 'Re-engage dormant leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'No Activity 30 Days', config: {} },
          { id: 'action-1', type: 'action', label: 'Send Re-engagement Email', config: {} },
          { id: 'delay-1', type: 'delay', label: 'Wait 7 days', config: { duration: 604800 } },
          { id: 'condition-1', type: 'condition', label: 'Check if Engaged', config: {} },
        ]
      },
      'Property Viewing Follow-up': {
        name: 'Property Viewing Follow-up',
        description: 'Follow-up after viewings',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Viewing Completed', config: {} },
          { id: 'action-1', type: 'action', label: 'Send Thank You Email', config: {} },
          { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: {} },
        ]
      },
      'Contract Milestones': {
        name: 'Contract Milestones',
        description: 'Alert at key contract stages',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Contract Stage Change', config: {} },
          { id: 'condition-1', type: 'condition', label: 'Check Milestone Type', config: {} },
          { id: 'action-1', type: 'action', label: 'Notify Team', config: {} },
          { id: 'action-2', type: 'action', label: 'Create Reminder Task', config: {} },
          { id: 'action-3', type: 'action', label: 'Update CRM', config: {} },
        ]
      },
      'Lead Qualification': {
        name: 'Lead Qualification',
        description: 'Qualify and route leads',
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'New Lead', config: {} },
          { id: 'condition-1', type: 'condition', label: 'Check Budget & Timeline', config: {} },
          { id: 'action-1', type: 'action', label: 'Add Qualified Tag', config: {} },
          { id: 'action-2', type: 'action', label: 'Assign to Agent', config: {} },
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
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">No data yet</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">No data yet</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">No data yet</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">No data yet</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">No execution data yet. Metrics will appear as workflows run.</p>
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
                  uses: 0, 
                  nodes: 3,
                  category: 'email',
                  workflow: '1. Trigger: New lead created → 2. Wait 1 hour → 3. Send welcome email'
                },
                { 
                  name: 'Lead Score & Notify', 
                  desc: 'Score leads based on activity and notify sales team when hot', 
                  icon: TrendingUp, 
                  uses: 0, 
                  nodes: 4,
                  category: 'lead',
                  workflow: '1. Trigger: Lead activity → 2. Check score > 80 → 3. Add hot tag → 4. Notify team'
                },
                { 
                  name: 'Follow-up Automation', 
                  desc: 'Auto follow-up after property showing with feedback requests', 
                  icon: Calendar, 
                  uses: 0, 
                  nodes: 5,
                  category: 'email',
                  workflow: '1. Viewing complete → 2. Wait 2 hours → 3. Feedback email → 4. Wait 2 days → 5. Create task'
                },
                { 
                  name: 'Task Assignment', 
                  desc: 'Auto-assign tasks to team members based on lead status', 
                  icon: CheckCircle2, 
                  uses: 0, 
                  nodes: 3,
                  category: 'task',
                  workflow: '1. Lead status changed → 2. If qualified → 3. Assign to sales rep'
                },
                { 
                  name: 'SMS Drip Campaign', 
                  desc: 'Multi-step SMS nurture sequence with timing controls', 
                  icon: MessageSquare, 
                  uses: 0, 
                  nodes: 4,
                  category: 'sms',
                  workflow: '1. Lead opts in → 2. Send welcome SMS → 3. Wait 3 days → 4. Send value SMS'
                },
                { 
                  name: 'Email Re-engagement', 
                  desc: 'Re-engage cold leads with strategic emails', 
                  icon: Zap, 
                  uses: 0, 
                  nodes: 4,
                  category: 'email',
                  workflow: '1. No activity 30 days → 2. Re-engagement email → 3. Wait 7 days → 4. Check if engaged'
                },
                { 
                  name: 'Property Viewing Follow-up', 
                  desc: 'Automated follow-up after viewings with scheduling', 
                  icon: Calendar, 
                  uses: 0, 
                  nodes: 3,
                  category: 'task',
                  workflow: '1. Viewing completed → 2. Thank you email → 3. Create follow-up task'
                },
                { 
                  name: 'Contract Milestones', 
                  desc: 'Alert team at key contract stages and deadlines', 
                  icon: FileText, 
                  uses: 0, 
                  nodes: 5,
                  category: 'task',
                  workflow: '1. Contract stage change → 2. Check milestone → 3. Notify team → 4. Create reminder → 5. Update CRM'
                },
                { 
                  name: 'Lead Qualification', 
                  desc: 'Automatically qualify and route leads to right team', 
                  icon: Filter, 
                  uses: 0, 
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
                { name: 'New Lead Welcome Series', desc: 'Automatically welcome and nurture new leads with personalized emails', icon: Mail, uses: 0, nodes: 3, category: 'email', workflow: '' },
                { name: 'Lead Score & Notify', desc: 'Score leads based on activity and notify sales team when hot', icon: TrendingUp, uses: 0, nodes: 4, category: 'lead', workflow: '' },
                { name: 'Follow-up Automation', desc: 'Auto follow-up after property showing with feedback requests', icon: Calendar, uses: 0, nodes: 5, category: 'email', workflow: '' },
                { name: 'Task Assignment', desc: 'Auto-assign tasks to team members based on lead status', icon: CheckCircle2, uses: 0, nodes: 3, category: 'task', workflow: '' },
                { name: 'SMS Drip Campaign', desc: 'Multi-step SMS nurture sequence with timing controls', icon: MessageSquare, uses: 0, nodes: 4, category: 'sms', workflow: '' },
                { name: 'Email Re-engagement', desc: 'Re-engage cold leads with strategic emails', icon: Zap, uses: 0, nodes: 4, category: 'email', workflow: '' },
                { name: 'Property Viewing Follow-up', desc: 'Automated follow-up after viewings with scheduling', icon: Calendar, uses: 0, nodes: 3, category: 'task', workflow: '' },
                { name: 'Contract Milestones', desc: 'Alert team at key contract stages and deadlines', icon: FileText, uses: 0, nodes: 5, category: 'task', workflow: '' },
                { name: 'Lead Qualification', desc: 'Automatically qualify and route leads to right team', icon: Filter, uses: 0, nodes: 4, category: 'lead', workflow: '' },
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
        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all" onClick={() => setShowMetricsPanel(!showMetricsPanel)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nodes in Workflow</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Workflow className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Click to view metrics</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No executions yet</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all" onClick={() => setShowLogsPanel(!showLogsPanel)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executionLogs.length}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Click to view logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide - Show when no nodes */}
      {nodes.length === 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Workflow className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Let's build your workflow! 🚀</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how you'd like to get started:
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-primary transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Use a Template</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Start with a pre-built workflow</p>
                  </button>
                  <button
                    onClick={() => setShowComponentLibrary(true)}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-primary transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Build from Scratch</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Add components one by one</p>
                  </button>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Pro Tip</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Start with a trigger, then add actions</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Workflow Canvas & Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Workflow Canvas */}
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Workflow Canvas
                </CardTitle>
                <CardDescription className="mt-1">
                  {interactionMode === 'drag' ? '🎯 Drag & drop components from the sidebar' : '✨ Click components to add them'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={interactionMode === 'drag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInteractionMode('drag')}
                  className={interactionMode === 'drag' ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950'}
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Drag
                </Button>
                <Button 
                  variant={interactionMode === 'click' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInteractionMode('click')}
                  className={interactionMode === 'click' ? 'bg-green-600 hover:bg-green-700 border-green-600' : 'border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950'}
                >
                  <MousePointer2 className="h-4 w-4 mr-2" />
                  Click
                </Button>
                {interactionMode === 'drag' && nodes.length > 1 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={autoArrangeNodes}
                    title="Auto-arrange nodes in a clean layout"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Auto-Arrange
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Validation Warnings */}
            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">Workflow Validation Issues</h4>
                    <ul className="text-xs text-yellow-800 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <WorkflowCanvas
              nodes={nodes}
              selectedNodeId={selectedNode?.id}
              onNodeSelect={handleNodeSelect}
              onNodeDelete={handleNodeDelete}
              onNodeEdit={handleNodeEdit}
              onNodeMove={handleNodeMove}
              isDraggingOver={isDraggingOver}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              mode={interactionMode}
              onTemplateSelect={importTemplate}
            />
          </CardContent>
        </Card>

        {/* Right Sidebar - Component Library & Config */}
        <div className="space-y-6">
          {/* Mode Toggle Info */}
          <Card className={interactionMode === 'drag' ? 'bg-blue-50 border-blue-200 border-2' : 'bg-green-50 border-green-200 border-2'}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {interactionMode === 'drag' ? (
                  <GripVertical className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <MousePointer2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-sm font-semibold mb-1 ${interactionMode === 'drag' ? 'text-blue-900' : 'text-green-900'}`}>
                    {interactionMode === 'drag' ? '🎯 Drag & Drop Mode Active' : '✨ Click Mode Active'}
                  </h4>
                  <p className={`text-xs leading-relaxed ${interactionMode === 'drag' ? 'text-blue-700' : 'text-green-700'}`}>
                    {interactionMode === 'drag' 
                      ? 'Drag components from below onto the canvas. You can also drag nodes to reposition them and click to configure.'
                      : 'Simply click any component below to instantly add it to your workflow! The component library stays open for quick building.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Node Configuration Panel */}
          {showConfigPanel && selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onSave={handleConfigSave}
              onClose={() => {
                setShowConfigPanel(false);
                setSelectedNode(null);
              }}
            />
          )}

          {/* Component Library */}
          {showComponentLibrary && !showConfigPanel && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Component Library</CardTitle>
                    <CardDescription className="text-xs">
                      {interactionMode === 'drag' ? 'Drag to add' : 'Click to add'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComponentLibrary(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <WorkflowComponentLibrary
                  onComponentSelect={handleComponentSelect}
                  onComponentDragStart={handleComponentDragStart}
                  mode={interactionMode}
                />
              </CardContent>
            </Card>
          )}

          {/* Show Component Library Toggle */}
          {!showComponentLibrary && !showConfigPanel && (
            <Button
              onClick={() => setShowComponentLibrary(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Show Component Library
            </Button>
          )}

          {/* Quick Actions */}
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

          {/* Selected Node Configuration - opens proper config panel */}
          {selectedNode && !showConfigPanel && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Node Configuration</CardTitle>
                <CardDescription className="text-xs">{selectedNode.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{selectedNode.label}</span> ({selectedNode.type})
                </p>
                <Button
                  className="w-full"
                  onClick={() => setShowConfigPanel(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Configure Node
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedNode(null)}
                >
                  Deselect
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
