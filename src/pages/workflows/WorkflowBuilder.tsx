import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Workflow, Plus, TrendingUp, Save, TestTube2, 
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
import { useNavigate } from 'react-router-dom';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeData } from '@/components/workflows/WorkflowNode';
import { WorkflowComponentLibrary, WorkflowComponent } from '@/components/workflows/WorkflowComponentLibrary';
import { NodeConfigPanel } from '@/components/workflows/NodeConfigPanel';
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary';
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
  
  // Open templates modal if linked from WorkflowsList with ?templates=true
  useEffect(() => {
    if (urlParams.get('templates') === 'true' && !workflowId) {
      setShowTemplates(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          (exec: WorkflowExecution) => exec.status === 'RUNNING' || (exec.status as string) === 'IN_PROGRESS'
        ).length;
        setActiveExecutions(runningCount);
        if (runningCount > 0) {
          setWorkflowStatus('running');
        }
        setExecutionLogs(executionsList.map((exec: Record<string, unknown>) => {
          const execStatus = (exec.status as string) || '';
          const execLead = (exec.lead && typeof exec.lead === 'object') ? exec.lead as Record<string, string> : undefined;
          const execSteps = Array.isArray(exec.steps) ? exec.steps as Record<string, unknown>[] : [];
          return {
          id: (exec.id as string) || '',
          timestamp: (exec.startedAt as string) || new Date().toISOString(),
          status: execStatus === 'COMPLETED' || execStatus === 'SUCCESS' ? 'success' as const : execStatus === 'FAILED' ? 'failed' as const : execStatus === 'IN_PROGRESS' || execStatus === 'RUNNING' ? 'running' as const : 'info' as const,
          error: (exec.error as string) || undefined,
          leadName: execLead ? `${execLead.firstName || ''} ${execLead.lastName || ''}`.trim() || undefined : undefined,
          leadEmail: execLead?.email || undefined,
          duration: exec.completedAt && exec.startedAt ? Math.round((new Date(exec.completedAt as string).getTime() - new Date(exec.startedAt as string).getTime()) / 1000) : 0,
          steps: execSteps.map((step: Record<string, unknown>) => ({
            id: step.id,
            stepIndex: step.stepIndex,
            actionType: (step.actionType as string) || 'UNKNOWN',
            actionLabel: (step.actionLabel as string) || '',
            status: step.status as ExecutionStep['status'],
            error: (step.error as string) || undefined,
            retryCount: (step.retryCount as number) || 0,
            durationMs: (step.durationMs as number) || 0,
            branchTaken: (step.branchTaken as string) || undefined,
            startedAt: (step.startedAt as string) || '',
            completedAt: (step.completedAt as string) || undefined,
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
    addNodeFromComponent(component);
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
    
    // Check trigger is configured
    const unconfiguredTriggers = triggers.filter(n => !n.config?.triggerType);
    if (unconfiguredTriggers.length > 0) {
      errors.push('Trigger node needs to be configured');
    }
    
    // Check for disconnected nodes (basic check)
    if (nodes.length > 0 && (!nodes[0] || nodes[0]?.type !== 'trigger')) {
      errors.push('Workflow should start with a trigger');
    }
    
    // Check for actions without triggers
    if (nodes.length > 0 && triggers.length === 0) {
      errors.push('Cannot have actions without a trigger');
    }
    
    // Check action nodes are configured
    const unconfiguredActions = nodes.filter(n => n.type === 'action' && !n.config?.actionType);
    if (unconfiguredActions.length > 0) {
      errors.push(`${unconfiguredActions.length} action node(s) need configuration`);
    }
    
    // Check delay nodes are configured
    const unconfiguredDelays = nodes.filter(n => n.type === 'delay' && !n.config?.duration);
    if (unconfiguredDelays.length > 0) {
      errors.push(`${unconfiguredDelays.length} delay node(s) need a duration`);
    }
    
    // Check condition nodes are configured
    const unconfiguredConditions = nodes.filter(n => n.type === 'condition' && !n.config?.conditionType);
    if (unconfiguredConditions.length > 0) {
      errors.push(`${unconfiguredConditions.length} condition node(s) need configuration`);
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
    // Run full validation and block save if errors exist
    if (!validateWorkflow()) {
      toast.error('Please fix validation errors before saving.');
      return;
    }
    
    setIsSaving(true);
    try {
      // Map nodes to the format the backend expects
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const actionNodes = nodes.filter(n => n.type !== 'trigger');

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

      if (workflowId) {
        await workflowsApi.updateWorkflow(workflowId, workflowData);
        toast.success('Workflow updated successfully');
      } else {
        const result = await workflowsApi.createWorkflow(workflowData);
        toast.success('Workflow created successfully');
        // Redirect to edit the newly created workflow to prevent duplicate creates
        const newId = result?.data?.workflow?.id;
        if (newId) {
          navigate(`/workflows/builder?id=${newId}`, { replace: true });
        }
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
      
      if (workflowId) {
        const result = await workflowsApi.testWorkflow(workflowId, testInput ? { leadIdentifier: testInput } : undefined);
        const testData = result?.data || result;
        if (testData?.executionId) {
          toast.success('Test completed — check execution logs for details');
          // Open logs panel and refresh to show the test result
          setShowLogsPanel(true);
          fetchWorkflowStatus(workflowId);
        } else {
          toast.success('Test completed successfully');
        }
      } else {
        toast.warning('Please save the workflow before testing');
      }
    } catch (error) {
      logger.error('Failed to test workflow:', error);
      const message = error instanceof Error ? error.message : 'Test execution failed';
      toast.error(message);
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
    <div className="relative flex flex-col h-[calc(100vh-10rem)]">
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

      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-bold p-1 h-auto w-52 focus-visible:ring-1 border border-dashed border-border hover:border-border focus:border-primary bg-transparent hover:bg-muted/50 transition-colors"
            placeholder="Workflow name"
            aria-label="Workflow name"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md border flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              workflowStatus === 'running' ? 'bg-success animate-pulse' :
              workflowStatus === 'active' ? 'bg-primary' :
              workflowStatus === 'paused' ? 'bg-warning' :
              'bg-muted-foreground'
            }`} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {workflowStatus === 'running' ? `Running (${activeExecutions})` :
               workflowStatus === 'active' ? 'Active' :
               workflowStatus === 'paused' ? 'Paused' :
               'Draft'}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">{nodes.length} nodes</Badge>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">{analyticsData?.totalExecutions ?? 0} runs</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant={showMetricsPanel ? 'default' : 'ghost'} size="sm" onClick={() => { setShowMetricsPanel(!showMetricsPanel); setShowLogsPanel(false); }} title="Performance Metrics">
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button variant={showLogsPanel ? 'default' : 'ghost'} size="sm" onClick={() => { setShowLogsPanel(!showLogsPanel); setShowMetricsPanel(false); }} title="Execution Logs">
            <Activity className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={runTest}
            disabled={isTestRunning || !workflowId}
            title={!workflowId ? 'Save first to test' : 'Run a test execution'}
          >
            <TestTube2 className="h-4 w-4 mr-1.5" />
            {isTestRunning ? 'Running...' : 'Test'}
          </Button>
          <Button size="sm" onClick={saveWorkflow} disabled={isSaving} className="relative">
            <Save className={`h-4 w-4 mr-1.5 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save'}
            {hasUnsavedChanges && !isSaving && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Performance Metrics - floating panel */}
      {showMetricsPanel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMetricsPanel(false)} />
          <div className="absolute top-12 right-4 z-40 w-80 bg-card rounded-xl shadow-xl border ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-primary/10 rounded">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Performance Metrics</h3>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted transition-colors" onClick={() => setShowMetricsPanel(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              <div className="bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Executions</p>
                <p className="text-xl font-bold mt-0.5">{analyticsData?.totalExecutions ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{analyticsData?.totalExecutions ? 'All time' : 'No data yet'}</p>
              </div>
              <div className="bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Success Rate</p>
                <p className={`text-xl font-bold mt-0.5 ${analyticsData?.successRate != null && analyticsData.successRate >= 95 ? 'text-success' : ''}`}>{analyticsData?.successRate != null ? `${Math.round(analyticsData.successRate)}%` : '—'}</p>
                <p className="text-[10px] text-muted-foreground">{analyticsData?.successRate != null ? (analyticsData.successRate >= 95 ? 'Excellent' : 'All runs') : 'No data yet'}</p>
              </div>
              <div className="bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                <p className="text-xl font-bold mt-0.5">{analyticsData?.avgDuration != null ? `${Math.round(analyticsData.avgDuration)}s` : '—'}</p>
                <p className="text-[10px] text-muted-foreground">{analyticsData?.avgDuration != null ? 'Per execution' : 'No data yet'}</p>
              </div>
              <div className="bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Active Runs</p>
                <p className={`text-xl font-bold mt-0.5 ${activeExecutions > 0 ? 'text-primary' : ''}`}>{activeExecutions}</p>
                <p className="text-[10px] text-muted-foreground">{activeExecutions > 0 ? 'Running now' : 'None active'}</p>
              </div>
            </div>
          </div>
        </>
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
                className="px-3 py-2 border rounded-md text-sm bg-background text-foreground border-border transition-colors"
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

      {/* Retry & Failure Settings - compact inline bar */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-4 text-sm pb-1 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Retries:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3].map((n) => (
                <Button
                  key={n}
                  variant={maxRetries === n ? 'default' : 'outline'}
                  size="sm"
                  className="w-6 h-6 p-0 text-xs"
                  onClick={() => setMaxRetries(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="notifyOnFailure"
              checked={notifyOnFailure}
              onChange={(e) => setNotifyOnFailure(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            <label htmlFor="notifyOnFailure" className="text-xs text-muted-foreground cursor-pointer">
              Notify on failure
            </label>
          </div>
        </div>
      )}

      {/* Main Workflow Canvas & Panels */}
      <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-3">
        {/* Visual Workflow Canvas */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/50 flex-shrink-0 py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Workflow className="h-4 w-4" />
                Canvas
                <span className="text-xs font-normal text-muted-foreground">
                  {interactionMode === 'drag' ? '— drag & drop' : '— click to add'}
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={interactionMode === 'drag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInteractionMode('drag')}
                  className={interactionMode === 'drag' ? 'bg-primary hover:bg-primary/90 border-primary transition-colors' : 'border-primary/30 text-primary hover:bg-primary/5 transition-colors'}
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Drag
                </Button>
                <Button 
                  variant={interactionMode === 'click' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInteractionMode('click')}
                  className={interactionMode === 'click' ? 'bg-success hover:bg-success/90 border-success transition-colors' : 'border-success/30 text-success hover:bg-success/5 transition-colors'}
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
                    className="border-primary/30 text-primary hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors"
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
                    className="border-warning/30 text-warning hover:bg-warning/5 transition-colors"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-2">
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
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">
                        {unconfigured.length} node{unconfigured.length > 1 ? 's' : ''} need{unconfigured.length === 1 ? 's' : ''} configuration
                      </p>
                      <p className="text-xs text-warning/80 mt-0.5">
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
              <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-warning mb-1">Workflow Validation Issues</h4>
                    <ul className="text-xs text-warning/80 space-y-1">
                      {validationErrors.map((error) => (
                        <li key={error}>• {error}</li>
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
        <div className="overflow-y-auto space-y-3">
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
                      <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
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
                      const newId = response?.data?.workflow?.id
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

      {/* Execution Logs - floating panel */}
      {showLogsPanel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowLogsPanel(false)} />
          <div className="absolute top-12 right-4 z-40 w-96 max-h-[60vh] bg-card rounded-xl shadow-xl border ring-1 ring-black/5 dark:ring-white/10 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30 rounded-t-xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary/10 dark:bg-primary/10 rounded">
                <Activity className="h-3.5 w-3.5 text-primary dark:text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Execution Logs</h3>
              {executionLogs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{executionLogs.length}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted transition-colors" onClick={() => setShowLogsPanel(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="overflow-y-auto flex-1 p-3">
            {executionLogs.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No executions recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Run a test to see logs here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {executionLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg overflow-hidden text-xs">
                    <div className={`px-2.5 py-1.5 flex items-center justify-between ${
                      log.status === 'success' ? 'bg-success/10' :
                      log.status === 'failed' ? 'bg-destructive/10' :
                      log.status === 'running' ? 'bg-primary/10' : 'bg-muted/30'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {log.status === 'success' && <CheckCircle2 className="h-3 w-3 text-success" />}
                        {log.status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
                        {log.status === 'running' && <Activity className="h-3 w-3 text-primary animate-pulse" />}
                        {log.status === 'info' && <Activity className="h-3 w-3 text-muted-foreground" />}
                        <span className="font-medium capitalize">{log.status}</span>
                        {log.leadName && (
                          <span className="text-muted-foreground truncate max-w-[120px]">— {log.leadName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {log.duration > 0 && <span>{log.duration}s</span>}
                      </div>
                    </div>
                    {log.steps.length > 0 && (
                      <div className="divide-y">
                        {log.steps.map((step) => (
                          <div key={step.id} className="px-2.5 py-1 flex items-center gap-2">
                            {step.status === 'SUCCESS' && <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />}
                            {step.status === 'FAILED' && <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
                            {step.status === 'RUNNING' && <Activity className="h-3 w-3 text-primary animate-pulse flex-shrink-0" />}
                            {step.status === 'PENDING' && <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            <span className="truncate">{step.actionLabel || step.actionType}</span>
                            <span className="text-muted-foreground ml-auto flex-shrink-0">
                              {step.durationMs != null ? `${step.durationMs}ms` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default WorkflowBuilder;
