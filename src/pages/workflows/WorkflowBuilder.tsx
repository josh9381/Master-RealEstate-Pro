import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Workflow, Play, Plus, TrendingUp, Save, TestTube2, 
  CheckCircle2, XCircle, Activity, Download, Upload,
  Copy, Zap, Mail, MessageSquare, Clock,
  Calendar, FileText, ChevronDown, ChevronRight,
  ArrowRight, Filter, Terminal, GripVertical, MousePointer2, X,
  AlertCircle, Undo2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeData } from '@/components/workflows/WorkflowNode';
import { WorkflowComponentLibrary, WorkflowComponent } from '@/components/workflows/WorkflowComponentLibrary';
import { NodeConfigPanel } from '@/components/workflows/NodeConfigPanel';
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary';
import { WorkflowsTabNav } from '@/components/workflows/WorkflowsTabNav';
import type { WorkflowAction, WorkflowExecution } from '@/types';

interface ExecutionStep {
  id: string;
  stepIndex: number;
  actionType: string;
  actionLabel?: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';
  error?: string;
  retryCount: number;
  durationMs?: number;
  branchTaken?: string;
  startedAt: string;
  completedAt?: string;
}

interface ExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running' | 'info';
  leadName?: string;
  leadEmail?: string;
  error?: string;
  duration: number;
  steps: ExecutionStep[];
}

interface WorkflowTemplate {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  uses: number;
  category: string;
  workflow: string;
  nodes: WorkflowNodeData[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: 'New Lead Welcome Series',
    desc: 'Automatically welcome and nurture new leads with personalized emails',
    icon: Mail,
    uses: 0,
    category: 'email',
    workflow: '1. Trigger: New lead created → 2. Wait 1 hour → 3. Send welcome email',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'New Lead Created', config: { triggerType: 'LEAD_CREATED' } },
      { id: 'delay-1', type: 'delay', label: 'Wait 1 hour', config: { duration: 1, unit: 'hours' } },
      { id: 'action-1', type: 'action', label: 'Send Welcome Email', config: { actionType: 'SEND_EMAIL' } },
    ],
  },
  {
    name: 'Lead Score & Notify',
    desc: 'Score leads based on activity and notify sales team when hot',
    icon: TrendingUp,
    uses: 0,
    category: 'lead',
    workflow: '1. Trigger: Lead activity → 2. Check score > 80 → 3. Add hot tag → 4. Notify team',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Lead Activity', config: { triggerType: 'LEAD_STATUS_CHANGED' } },
      { id: 'condition-1', type: 'condition', label: 'Check Lead Score > 80', config: { conditionType: 'lead_field', field: 'score', operator: 'greater_than', value: 80 } },
      { id: 'action-1', type: 'action', label: 'Add Hot Lead Tag', config: { actionType: 'ADD_TAG' } },
      { id: 'action-2', type: 'action', label: 'Notify Sales Team', config: { actionType: 'SEND_NOTIFICATION' } },
    ],
  },
  {
    name: 'Follow-up Automation',
    desc: 'Auto follow-up after property showing with feedback requests',
    icon: Calendar,
    uses: 0,
    category: 'email',
    workflow: '1. Viewing complete → 2. Wait 2 hours → 3. Feedback email → 4. Wait 2 days → 5. Create task',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Property Viewing Complete', config: { triggerType: 'LEAD_STATUS_CHANGED' } },
      { id: 'delay-1', type: 'delay', label: 'Wait 2 hours', config: { duration: 2, unit: 'hours' } },
      { id: 'action-1', type: 'action', label: 'Send Feedback Email', config: { actionType: 'SEND_EMAIL' } },
      { id: 'delay-2', type: 'delay', label: 'Wait 2 days', config: { duration: 2, unit: 'days' } },
      { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: { actionType: 'CREATE_TASK' } },
    ],
  },
  {
    name: 'Task Assignment',
    desc: 'Auto-assign tasks to team members based on lead status',
    icon: CheckCircle2,
    uses: 0,
    category: 'task',
    workflow: '1. Lead status changed → 2. If qualified → 3. Assign to sales rep',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Lead Status Changed', config: { triggerType: 'LEAD_STATUS_CHANGED' } },
      { id: 'condition-1', type: 'condition', label: 'If Status = Qualified', config: { conditionType: 'lead_field', field: 'status', operator: 'equals', value: 'qualified' } },
      { id: 'action-1', type: 'action', label: 'Assign to Sales Rep', config: { actionType: 'ASSIGN_LEAD' } },
    ],
  },
  {
    name: 'SMS Drip Campaign',
    desc: 'Multi-step SMS nurture sequence with timing controls',
    icon: MessageSquare,
    uses: 0,
    category: 'sms',
    workflow: '1. Lead opts in → 2. Send welcome SMS → 3. Wait 3 days → 4. Send value SMS',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Lead Opts In', config: { triggerType: 'TAG_ADDED' } },
      { id: 'action-1', type: 'action', label: 'Send Welcome SMS', config: { actionType: 'SEND_SMS' } },
      { id: 'delay-1', type: 'delay', label: 'Wait 3 days', config: { duration: 3, unit: 'days' } },
      { id: 'action-2', type: 'action', label: 'Send Value SMS', config: { actionType: 'SEND_SMS' } },
    ],
  },
  {
    name: 'Email Re-engagement',
    desc: 'Re-engage cold leads with strategic emails',
    icon: Zap,
    uses: 0,
    category: 'email',
    workflow: '1. No activity 30 days → 2. Re-engagement email → 3. Wait 7 days → 4. Check if engaged',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'No Activity 30 Days', config: { triggerType: 'TIME_BASED' } },
      { id: 'action-1', type: 'action', label: 'Send Re-engagement Email', config: { actionType: 'SEND_EMAIL' } },
      { id: 'delay-1', type: 'delay', label: 'Wait 7 days', config: { duration: 7, unit: 'days' } },
      { id: 'condition-1', type: 'condition', label: 'Check if Engaged', config: { conditionType: 'email_opened' } },
    ],
  },
  {
    name: 'Property Viewing Follow-up',
    desc: 'Automated follow-up after viewings with scheduling',
    icon: Calendar,
    uses: 0,
    category: 'task',
    workflow: '1. Viewing completed → 2. Thank you email → 3. Create follow-up task',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Viewing Completed', config: { triggerType: 'LEAD_STATUS_CHANGED' } },
      { id: 'action-1', type: 'action', label: 'Send Thank You Email', config: { actionType: 'SEND_EMAIL' } },
      { id: 'action-2', type: 'action', label: 'Create Follow-up Task', config: { actionType: 'CREATE_TASK' } },
    ],
  },
  {
    name: 'Contract Milestones',
    desc: 'Alert team at key contract stages and deadlines',
    icon: FileText,
    uses: 0,
    category: 'task',
    workflow: '1. Contract stage change → 2. Check milestone → 3. Notify team → 4. Create reminder → 5. Update CRM',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Contract Stage Change', config: { triggerType: 'LEAD_STATUS_CHANGED' } },
      { id: 'condition-1', type: 'condition', label: 'Check Milestone Type', config: { conditionType: 'lead_field' } },
      { id: 'action-1', type: 'action', label: 'Notify Team', config: { actionType: 'SEND_NOTIFICATION' } },
      { id: 'action-2', type: 'action', label: 'Create Reminder Task', config: { actionType: 'CREATE_TASK' } },
      { id: 'action-3', type: 'action', label: 'Update CRM', config: { actionType: 'UPDATE_LEAD' } },
    ],
  },
  {
    name: 'Lead Qualification',
    desc: 'Automatically qualify and route leads to right team',
    icon: Filter,
    uses: 0,
    category: 'lead',
    workflow: '1. New lead → 2. Check budget & timeline → 3. Add qualified tag → 4. Assign to agent',
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'New Lead', config: { triggerType: 'LEAD_CREATED' } },
      { id: 'condition-1', type: 'condition', label: 'Check Budget & Timeline', config: { conditionType: 'lead_field' } },
      { id: 'action-1', type: 'action', label: 'Add Qualified Tag', config: { actionType: 'ADD_TAG' } },
      { id: 'action-2', type: 'action', label: 'Assign to Agent', config: { actionType: 'ASSIGN_LEAD' } },
    ],
  },
];

const WorkflowBuilder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [isSaving, setIsSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingTemplateName, setPendingTemplateName] = useState<string | null>(null);
  const deleteConfirmTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(deleteConfirmTimerRef.current) }, []);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'active' | 'paused' | 'running'>('idle');
  const [activeExecutions, setActiveExecutions] = useState<number>(0);
  const [interactionMode, setInteractionMode] = useState<'click' | 'drag'>('drag');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Retry & failure notification settings
  const [maxRetries, setMaxRetries] = useState(3);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  // Undo stack for node deletions
  const [undoStack, setUndoStack] = useState<{ nodes: WorkflowNodeData[]; label: string }[]>([]);

  // Track unsaved changes for beforeunload warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialNodesRef = useRef<string>('');

  // Mark dirty when nodes or name change after initial load
  useEffect(() => {
    const serialized = JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, label: n.label, config: n.config })));
    if (initialNodesRef.current === '') {
      initialNodesRef.current = serialized;
    } else if (serialized !== initialNodesRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [nodes]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Execution logs
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

  const urlParams = new URLSearchParams(window.location.search);
  const workflowId = urlParams.get('id');

  // Load workflow data via useQuery when ID is present
  useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const response = await workflowsApi.getWorkflow(workflowId!);

      if (response?.data?.workflow) {
        const workflow = response.data.workflow;
        setWorkflowName(workflow.name || 'Workflow');
        setWorkflowStatus(workflow.isActive ? 'active' : 'idle');
        setMaxRetries(workflow.maxRetries ?? 3);
        setNotifyOnFailure(workflow.notifyOnFailure ?? true);

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
            position: { x: 400, y: 100 }
          });
        }

        // Add action nodes with proper spacing and correct node types
        // Backend stores actions as { conditions: [], actions: [...] } or as flat array
        const rawActions = workflow.actions;
        const actionsList = Array.isArray(rawActions) 
          ? rawActions 
          : (rawActions?.actions || rawActions?.steps || []);
        
        if (actionsList && Array.isArray(actionsList)) {
          actionsList.forEach((action: WorkflowAction, index: number) => {
            const actionType = action.type || 'action';
            
            // Determine the correct node type based on action type
            let nodeType: 'action' | 'delay' | 'condition' = 'action';
            if (actionType === 'DELAY') {
              nodeType = 'delay';
            } else if (actionType === 'CONDITION') {
              nodeType = 'condition';
            }

            // Use the saved label if available, otherwise generate from type
            const actionLabel = String((action.config as Record<string, unknown>)?.label || '') || actionType.replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (l: string) => l.toUpperCase());

            reconstructedNodes.push({
              id: String(action.id || `action-${index}`),
              type: nodeType,
              label: actionLabel,
              description: String(action.description || ''),
              config: (action.config || {}) as Record<string, unknown>,
              position: { x: 400, y: 100 + ((index + 1) * 180) }
            });
          });
        }

        setNodes(reconstructedNodes);
        toast.success(`Workflow loaded: ${workflow.name}`);
      }

      return response;
    },
    enabled: !!workflowId,
  });

  // Fetch workflow analytics when editing existing workflow
  const { data: analyticsData } = useQuery({
    queryKey: ['workflowAnalytics', workflowId],
    queryFn: async () => {
      const response = await workflowsApi.getAnalytics(workflowId!);
      return response?.data || response;
    },
    enabled: !!workflowId,
  });

  // Kick off initial polling when workflow ID is present
  useEffect(() => {
    if (workflowId) {
      fetchWorkflowStatus(workflowId);
    }
  }, [workflowId]);

  // Poll workflow status every 5 seconds only when logs or metrics panel is visible
  useEffect(() => {
    if (!workflowId || (!showLogsPanel && !showMetricsPanel)) return;

    const interval = setInterval(() => {
      fetchWorkflowStatus(workflowId);
    }, 5000);

    return () => clearInterval(interval);
  }, [workflowId, showLogsPanel, showMetricsPanel]);

  const fetchWorkflowStatus = async (workflowId: string) => {
    try {
      const [workflowData, executionsData] = await Promise.all([
        workflowsApi.getWorkflow(workflowId),
        workflowsApi.getExecutions(workflowId, { page: 1, limit: 10 })
      ]);

      // Update workflow status (response is { success, data: { workflow } })
      const workflow = workflowData?.data?.workflow || workflowData?.workflow || workflowData;
      if (workflow) {
        setWorkflowStatus(workflow.isActive ? 'active' : 'idle');
      }

      // Check for running executions and populate logs
      // Response is { success, data: { executions, pagination } }
      const executionsList = executionsData?.data?.executions || executionsData?.executions;
      if (executionsList) {
        const runningCount = executionsList.filter(
          (exec: WorkflowExecution) => exec.status === 'IN_PROGRESS' || exec.status === 'RUNNING'
        ).length;
        setActiveExecutions(runningCount);
        if (runningCount > 0) {
          setWorkflowStatus('running');
        }
        setExecutionLogs(executionsList.map((exec: Record<string, unknown>) => {
          const execStatus = exec.status as string;
          const execLead = exec.lead as Record<string, string> | undefined;
          const execSteps = (exec.steps || []) as Record<string, unknown>[];
          return {
          id: exec.id as string,
          timestamp: (exec.startedAt as string) || new Date().toISOString(),
          status: execStatus === 'COMPLETED' || execStatus === 'SUCCESS' ? 'success' as const : execStatus === 'FAILED' ? 'failed' as const : execStatus === 'IN_PROGRESS' || execStatus === 'RUNNING' ? 'running' as const : 'info' as const,
          error: (exec.error as string) || undefined,
          leadName: execLead ? `${execLead.firstName || ''} ${execLead.lastName || ''}`.trim() : undefined,
          leadEmail: execLead?.email,
          duration: exec.completedAt ? Math.round((new Date(exec.completedAt as string).getTime() - new Date(exec.startedAt as string).getTime()) / 1000) : 0,
          steps: execSteps.map((step: Record<string, unknown>) => ({
            id: step.id,
            stepIndex: step.stepIndex,
            actionType: step.actionType as string,
            actionLabel: step.actionLabel as string,
            status: step.status as ExecutionStep['status'],
            error: step.error as string,
            retryCount: (step.retryCount as number) || 0,
            durationMs: step.durationMs as number,
            branchTaken: step.branchTaken as string,
            startedAt: step.startedAt as string,
            completedAt: step.completedAt as string,
          })),
          }
        }));
      }
    } catch (error) {
      logger.error('Failed to fetch workflow status:', error);
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
    // Auto-open config panel for the newly added node
    setSelectedNode(newNode);
    setShowConfigPanel(true);
    toast.success(`Added ${component.label} — configure it now`);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const duplicated: WorkflowNodeData = {
      ...node,
      id: `node-${Date.now()}`,
      label: `${node.label} (copy)`,
      position: node.position ? { x: node.position.x + 40, y: node.position.y + 40 } : undefined,
    };
    // Insert right after the original node
    const idx = nodes.indexOf(node);
    const updated = [...nodes];
    updated.splice(idx + 1, 0, duplicated);
    setNodes(updated);
    toast.success(`Duplicated "${node.label}"`);
  };

  const handleMoveNode = (nodeId: string, direction: 'up' | 'down') => {
    const idx = nodes.findIndex(n => n.id === nodeId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === nodes.length - 1) return;
    const updated = [...nodes];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setNodes(updated);
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
        logger.error('Failed to parse dropped component:', error);
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
    if (nodes.length > 0 && (!nodes[0] || nodes[0]?.type !== 'trigger')) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  const handleNodeSelect = (node: WorkflowNodeData) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const handleNodeDelete = (nodeId: string) => {
    if (showDeleteConfirm === nodeId) {
      // Confirmed — push current state to undo stack, then delete
      const deletedNode = nodes.find(n => n.id === nodeId);
      setUndoStack(prev => [...prev.slice(-9), { nodes: [...nodes], label: deletedNode?.label || 'node' }]);
      setNodes(nodes.filter(n => n.id !== nodeId));
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
        setShowConfigPanel(false);
      }
      setShowDeleteConfirm(null);
      clearTimeout(deleteConfirmTimerRef.current);
      toast.success('Node removed — click Undo to restore');
    } else {
      // Show inline confirmation badge on the node
      setShowDeleteConfirm(nodeId);
      clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = setTimeout(() => setShowDeleteConfirm(null), 4000);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) {
      toast.info('Nothing to undo');
      return;
    }
    const last = undoStack[undoStack.length - 1];
    setNodes(last.nodes);
    setUndoStack(prev => prev.slice(0, -1));
    toast.success(`Undo: restored "${last.label}"`);
  };

  const handleNodeEdit = (node: WorkflowNodeData) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const handleConfigSave = (nodeId: string, config: Record<string, unknown>) => {
    const { _nodeLabel, ...restConfig } = config;
    setNodes(nodes.map(n => 
      n.id === nodeId ? { ...n, config: restConfig, ...(typeof _nodeLabel === 'string' ? { label: _nodeLabel } : {}) } : n
    ));
    setShowConfigPanel(false);
    toast.success('Node configuration saved');
  };

  const saveWorkflow = async () => {
    setIsSaving(true);
    try {
      // Map nodes to the format the backend expects
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const actionNodes = nodes.filter(n => n.type !== 'trigger');

      // Validate action nodes have proper actionType configured
      const unconfiguredActions = actionNodes.filter(n => n.type === 'action' && !n.config?.actionType);
      if (unconfiguredActions.length > 0) {
        toast.error(`${unconfiguredActions.length} action node(s) missing configuration. Please configure all action nodes before saving.`);
        setIsSaving(false);
        return;
      }

      const workflowData = {
        name: workflowName,
        description: `Workflow with ${nodes.length} nodes`,
        triggerType: triggerNode?.config?.triggerType || 'MANUAL',
        triggerData: triggerNode?.config || {},
        actions: actionNodes.map(n => {
          // Map node types to proper action types
          let actionType: string;
          if (n.type === 'delay') {
            actionType = 'DELAY';
          } else if (n.type === 'condition') {
            actionType = 'CONDITION';
          } else {
            actionType = (n.config?.actionType as string) || 'UNKNOWN';
          }
          return {
            type: actionType,
            config: {
              ...n.config,
              label: n.label
            }
          };
        }),
        nodes: nodes,
        maxRetries,
        notifyOnFailure,
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
      setHasUnsavedChanges(false);
      initialNodesRef.current = JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, label: n.label, config: n.config })));
    } catch (error) {
      logger.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const runTest = async () => {
    try {
      setIsTestRunning(true);
      toast.info('Starting test execution...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const workflowId = urlParams.get('id');
      
      if (workflowId) {
        await workflowsApi.testWorkflow(workflowId, testInput ? { leadIdentifier: testInput } : undefined);
        toast.success('Test completed successfully');
      } else {
        toast.warning('Please save the workflow before testing');
      }
    } catch (error) {
      logger.error('Failed to test workflow:', error);
      toast.error('Test execution failed');
    } finally {
      setIsTestRunning(false);
    }
  };

  const importTemplate = (templateName: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      if (nodes.length > 0) {
        setPendingTemplateName(templateName);
        setShowImportConfirm(true);
        return;
      }
      setNodes(template.nodes);
      setWorkflowName(template.name);
      toast.success(`Imported ${template.nodes.length} nodes from "${templateName}"`);
    } else {
      toast.error('Template not found');
    }
    setShowTemplates(false);
  };

  const confirmImportTemplate = () => {
    if (!pendingTemplateName) return;
    const template = WORKFLOW_TEMPLATES.find(t => t.name === pendingTemplateName);
    if (template) {
      setNodes(template.nodes);
      setWorkflowName(template.name);
      toast.success(`Imported ${template.nodes.length} nodes from "${pendingTemplateName}"`);
    }
    setShowImportConfirm(false);
    setPendingTemplateName(null);
    setShowTemplates(false);
  };

  return (
    <div className="space-y-6">
      {/* Import Template Confirmation Dialog */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template?</DialogTitle>
            <DialogDescription>
              Importing &ldquo;{pendingTemplateName}&rdquo; will replace your current {nodes.length} node(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowImportConfirm(false); setPendingTemplateName(null); }}>
              Cancel
            </Button>
            <Button onClick={confirmImportTemplate}>
              Import Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/workflows" className="hover:text-foreground transition-colors">Workflows</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{workflowId ? workflowName : 'New Workflow'}</span>
      </nav>

      {/* Sub-Navigation Tabs */}
      <WorkflowsTabNav />

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-2xl font-bold p-1 h-auto focus-visible:ring-1 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-primary bg-transparent hover:bg-muted/50"
                placeholder="Enter workflow name"
                aria-label="Workflow name"
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
          <Button
            variant="outline"
            onClick={runTest}
            disabled={isTestRunning || !workflowId}
            title={!workflowId ? 'Save the workflow first to enable testing' : 'Run a test execution'}
          >
            <TestTube2 className="h-4 w-4 mr-2" />
            {isTestRunning ? 'Running...' : !workflowId ? 'Save First to Test' : 'Test Run'}
          </Button>
          <Button onClick={saveWorkflow} disabled={isSaving} className="relative">
            <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Workflow'}
            {hasUnsavedChanges && !isSaving && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
            )}
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
                <p className="text-2xl font-bold">{analyticsData?.totalExecutions ?? 0}</p>
                <p className="text-xs text-muted-foreground">{analyticsData?.totalExecutions ? 'All time' : 'No data yet'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{analyticsData?.successRate != null ? `${Math.round(analyticsData.successRate)}%` : '—'}</p>
                <p className="text-xs text-muted-foreground">{analyticsData?.successRate != null ? (analyticsData.successRate >= 95 ? 'Excellent!' : 'Based on all runs') : 'No data yet'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{analyticsData?.avgDuration != null ? `${Math.round(analyticsData.avgDuration)}s` : '—'}</p>
                <p className="text-xs text-muted-foreground">{analyticsData?.avgDuration != null ? 'Per execution' : 'No data yet'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Active Runs</p>
                <p className="text-2xl font-bold">{activeExecutions}</p>
                <p className="text-xs text-muted-foreground">{activeExecutions > 0 ? 'Running now' : 'None active'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{analyticsData?.totalExecutions ? 'View execution logs below for detailed step-by-step data.' : 'No execution data yet. Metrics will appear as workflows run.'}</p>
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
                className="px-3 py-2 border rounded-md text-sm bg-background text-foreground dark:border-gray-600"
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
              {WORKFLOW_TEMPLATES
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
                      <Badge variant="secondary" className="text-xs capitalize">{template.category}</Badge>
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
                      <span className="text-xs text-muted-foreground">{template.nodes.length} nodes</span>
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
            {WORKFLOW_TEMPLATES.filter(template => {
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
            <div className="text-2xl font-bold">{analyticsData?.totalExecutions ?? 0}</div>
            <p className="text-xs text-muted-foreground">{analyticsData?.totalExecutions ? `${analyticsData.totalExecutions} total` : 'No executions yet'}</p>
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
            <div className="text-2xl font-bold">{analyticsData?.successRate != null ? `${Math.round(analyticsData.successRate)}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">{analyticsData?.successRate != null ? (analyticsData.successRate >= 95 ? 'Excellent!' : 'Based on all runs') : 'No data yet'}</p>
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

      {/* Retry & Failure Notification Settings */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium whitespace-nowrap">Max Retries:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <Button
                    key={n}
                    variant={maxRetries === n ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setMaxRetries(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">per action step</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifyOnFailure"
                checked={notifyOnFailure}
                onChange={(e) => setNotifyOnFailure(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="notifyOnFailure" className="text-sm font-medium cursor-pointer">
                Notify on failure
              </label>
              <span className="text-xs text-muted-foreground">— get notified when a step fails after all retries</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
                {undoStack.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    title="Undo last deletion"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Unconfigured Nodes Summary */}
            {(() => {
              const unconfigured = nodes.filter(n => {
                if (!n.config) return true;
                const meaningful = Object.entries(n.config).filter(([key, val]) => {
                  if (key === 'triggerType' || key === 'actionType' || key === 'conditionType' || key === 'delayMode' || key === 'label' || key === '_nodeLabel') return false;
                  if (val === '' || val === null || val === undefined) return false;
                  return true;
                });
                return meaningful.length === 0;
              });
              if (unconfigured.length === 0) return null;
              return (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        {unconfigured.length} node{unconfigured.length > 1 ? 's' : ''} need{unconfigured.length === 1 ? 's' : ''} configuration
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {unconfigured.map(n => n.label).join(', ')}
                        {' — '}click a node to configure it
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
              onNodeDuplicate={handleDuplicateNode}
              onNodeMoveUp={(id) => handleMoveNode(id, 'up')}
              onNodeMoveDown={(id) => handleMoveNode(id, 'down')}
              isDraggingOver={isDraggingOver}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              mode={interactionMode}
              onTemplateSelect={importTemplate}
              deleteConfirmNodeId={showDeleteConfirm}
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
                  <h4 className={`text-sm font-semibold mb-1 ${interactionMode === 'drag' ? 'text-blue-900 dark:text-blue-200' : 'text-green-900 dark:text-green-200'}`}>
                    {interactionMode === 'drag' ? '🎯 Drag & Drop Mode Active' : '✨ Click Mode Active'}
                  </h4>
                  <p className={`text-xs leading-relaxed ${interactionMode === 'drag' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
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
            <ModalErrorBoundary name="Node Configuration" onClose={() => {
              setShowConfigPanel(false);
              setSelectedNode(null);
            }}>
              <NodeConfigPanel
                node={selectedNode}
                onSave={handleConfigSave}
                onClose={() => {
                  setShowConfigPanel(false);
                  setSelectedNode(null);
                }}
              />
            </ModalErrorBoundary>
          )}

          {/* Component Library */}
          {showComponentLibrary && (
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
          {!showComponentLibrary && (
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
                  <Input placeholder="Lead ID or Email" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
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
                  <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                    try {
                      const duplicatedNodes = nodes.map(n => ({ ...n, id: `${n.id}-copy-${Date.now()}` }))
                      const triggerNode = duplicatedNodes.find(n => n.type === 'trigger')
                      const actionNodes = duplicatedNodes.filter(n => n.type !== 'trigger')
                      const workflowData = {
                        name: `${workflowName} (Copy)`,
                        description: `Duplicated workflow with ${duplicatedNodes.length} nodes`,
                        triggerType: triggerNode?.config?.triggerType || 'MANUAL',
                        triggerData: triggerNode?.config || {},
                        actions: actionNodes.map(n => {
                          let actionType: string;
                          if (n.type === 'delay') actionType = 'DELAY';
                          else if (n.type === 'condition') actionType = 'CONDITION';
                          else actionType = (n.config?.actionType as string) || 'UNKNOWN';
                          return { type: actionType, config: { ...n.config, label: n.label } };
                        }),
                        nodes: duplicatedNodes,
                        status: 'draft' as const
                      }
                      const response = await workflowsApi.createWorkflow(workflowData)
                      const newId = response?.data?.id || response?.id
                      toast.success('Workflow duplicated successfully')
                      if (newId) {
                        navigate(`/workflows/builder?id=${newId}`);
                      }
                    } catch (error) {
                      logger.error('Failed to duplicate workflow:', error)
                      toast.error('Failed to duplicate workflow')
                    }
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Workflow
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    const triggerNode = nodes.find(n => n.type === 'trigger');
                    const actionNodes = nodes.filter(n => n.type !== 'trigger');
                    const exportData = {
                      name: workflowName,
                      triggerType: triggerNode?.config?.triggerType || 'MANUAL',
                      triggerData: triggerNode?.config || {},
                      actions: actionNodes.map(n => {
                        let actionType: string;
                        if (n.type === 'delay') actionType = 'DELAY';
                        else if (n.type === 'condition') actionType = 'CONDITION';
                        else actionType = (n.config?.actionType as string) || 'UNKNOWN';
                        return { type: actionType, config: { ...n.config, label: n.label } };
                      }),
                      nodes,
                      status: workflowStatus,
                      totalNodes: nodes.length,
                      exportedAt: new Date().toISOString()
                    }
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success('Workflow exported as JSON')
                  }}>
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
                <CardTitle className="text-base">Configure Node</CardTitle>
                <CardDescription className="text-xs">{selectedNode.label}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => setShowConfigPanel(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Open Configuration
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
                <CardDescription>Per-step execution history for recent runs</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowLogsPanel(false)}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {executionLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No executions recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {executionLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg overflow-hidden">
                    {/* Execution header */}
                    <div className={`p-3 flex items-center justify-between ${
                      log.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' :
                      log.status === 'failed' ? 'bg-red-50 dark:bg-red-950/20' :
                      log.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-muted/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                        {log.status === 'running' && <Activity className="h-4 w-4 text-blue-600 animate-pulse" />}
                        {log.status === 'info' && <Activity className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-sm capitalize">{log.status}</span>
                        {log.leadName && (
                          <span className="text-xs text-muted-foreground">— {log.leadName} {log.leadEmail ? `(${log.leadEmail})` : ''}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {log.duration > 0 && <Badge variant="outline">{log.duration}s</Badge>}
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Per-step detail */}
                    {log.steps.length > 0 ? (
                      <div className="divide-y">
                        {log.steps.map((step) => (
                          <div key={step.id} className="px-4 py-2 flex items-start gap-3 text-sm">
                            <div className="pt-0.5 flex-shrink-0">
                              {step.status === 'SUCCESS' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              {step.status === 'FAILED' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                              {step.status === 'RUNNING' && <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />}
                              {step.status === 'PENDING' && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{step.actionLabel || step.actionType}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {step.actionType}
                                </Badge>
                                {step.branchTaken && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    branch: {step.branchTaken}
                                  </Badge>
                                )}
                                {step.retryCount > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {step.retryCount} {step.retryCount === 1 ? 'retry' : 'retries'}
                                  </Badge>
                                )}
                              </div>
                              {step.error && (
                                <p className="text-xs text-red-600 mt-0.5 truncate">{step.error}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {step.durationMs != null ? `${step.durationMs}ms` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        {log.error ? `Error: ${log.error}` : log.status === 'running' ? 'Execution in progress…' : 'No step details available'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkflowBuilder;
