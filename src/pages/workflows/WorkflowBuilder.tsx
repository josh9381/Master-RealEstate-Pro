import { useState } from 'react';
import { 
  Workflow, Play, Plus, TrendingUp, Save, TestTube2, Clock, 
  CheckCircle2, XCircle, Activity, Download, Upload, Trash2,
  Copy, Settings, Zap, Mail, MessageSquare, UserPlus, Tag,
  Calendar, FileText, ChevronDown, ChevronRight,
  ArrowRight, GitBranch, Filter, Terminal, GripVertical, MousePointer2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

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
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showTriggerBuilder, setShowTriggerBuilder] = useState(false);
  const [showActionLibrary, setShowActionLibrary] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
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

  const saveWorkflow = () => {
    toast.success('Workflow saved successfully');
  };

  const runTest = () => {
    setIsTestRunning(true);
    toast.info('Starting test execution...');
    setTimeout(() => {
      setIsTestRunning(false);
      toast.success('Test completed successfully');
    }, 3000);
  };

  const importTemplate = (templateName: string) => {
    toast.success(`Imported template: ${templateName}`);
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
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
            />
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

      {/* Template Marketplace */}
      {showTemplates && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflow Templates</CardTitle>
                <CardDescription>Pre-built workflows you can customize</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: 'New Lead Welcome Series', desc: 'Automatically welcome and nurture new leads', icon: Mail, uses: 1243 },
                { name: 'Lead Score & Notify', desc: 'Score leads and notify sales team', icon: TrendingUp, uses: 892 },
                { name: 'Follow-up Automation', desc: 'Auto follow-up after property showing', icon: Calendar, uses: 756 },
                { name: 'Task Assignment', desc: 'Auto-assign tasks based on lead status', icon: CheckCircle2, uses: 654 },
                { name: 'SMS Drip Campaign', desc: 'Multi-step SMS nurture sequence', icon: MessageSquare, uses: 543 },
                { name: 'Email Re-engagement', desc: 'Re-engage cold leads automatically', icon: Zap, uses: 421 },
              ].map((template) => (
                <Card key={template.name} className="hover:border-primary cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <template.icon className="h-8 w-8 text-primary" />
                      <Badge variant="secondary">{template.uses} uses</Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                    <CardDescription className="text-xs">{template.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => importTemplate(template.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                        className={`cursor-pointer transition-colors ${
                          selectedNode?.id === node.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                node.type === 'trigger' ? 'bg-blue-100 text-blue-600' :
                                node.type === 'action' ? 'bg-green-100 text-green-600' :
                                node.type === 'condition' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-purple-100 text-purple-600'
                              }`}>
                                {node.type === 'trigger' && <Zap className="h-4 w-4" />}
                                {node.type === 'action' && <Settings className="h-4 w-4" />}
                                {node.type === 'condition' && <GitBranch className="h-4 w-4" />}
                                {node.type === 'delay' && <Clock className="h-4 w-4" />}
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
                        <div className="flex justify-center">
                          <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
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
