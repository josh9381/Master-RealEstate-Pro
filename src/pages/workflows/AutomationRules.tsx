import { useState } from 'react';
import { Zap, Plus, Clock, Target, CheckCircle, X, Edit2, Trash2, Pause, Play, Filter as FilterIcon, ArrowUpDown, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

const AutomationRules = () => {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'executions' | 'lastRun'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  const [automationRules, setAutomationRules] = useState([
    {
      id: 1,
      name: 'Welcome New Leads',
      description: 'Send welcome email when lead is created',
      trigger: 'Lead Created',
      actions: ['Send Email', 'Create Task'],
      status: 'active' as const,
      executions: 1234,
      lastRun: '2 min ago',
    },
    {
      id: 2,
      name: 'Follow-up Qualified Leads',
      description: 'Create task when lead status changes to qualified',
      trigger: 'Status Changed',
      actions: ['Create Task', 'Assign User'],
      status: 'active' as const,
      executions: 567,
      lastRun: '15 min ago',
    },
    {
      id: 3,
      name: 'Inactive Lead Reminder',
      description: 'Send reminder if no activity for 7 days',
      trigger: 'Schedule',
      actions: ['Send Notification'],
      status: 'paused' as const,
      executions: 89,
      lastRun: '2 days ago',
    },
  ]);

  const toggleRuleStatus = (ruleId: number) => {
    setAutomationRules(automationRules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, status: rule.status === 'active' ? 'paused' as const : 'active' as const }
        : rule
    ));
    const rule = automationRules.find(r => r.id === ruleId);
    if (rule) {
      toast.success(`Rule ${rule.status === 'active' ? 'paused' : 'activated'}`);
    }
  };

  const deleteRule = (ruleId: number) => {
    setAutomationRules(automationRules.filter(rule => rule.id !== ruleId));
    toast.success('Rule deleted successfully');
  };

  const editRule = (_ruleId: number) => {
    toast.info('Edit functionality - opens rule editor');
  };

  const createRule = () => {
    if (!newRuleName.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    const newRule = {
      id: Math.max(...automationRules.map(r => r.id)) + 1,
      name: newRuleName,
      description: newRuleDescription || 'No description',
      trigger: 'Lead Created',
      actions: ['Send Email'],
      status: 'active' as const,
      executions: 0,
      lastRun: 'Never',
    };
    setAutomationRules([...automationRules, newRule]);
    toast.success('Rule created successfully');
    setShowCreateModal(false);
    setNewRuleName('');
    setNewRuleDescription('');
  };

  const applyTemplate = (templateName: string) => {
    toast.success(`Applied template: ${templateName}`);
    setShowCreateModal(true);
    setNewRuleName(templateName);
  };

  const handleSort = () => {
    const nextSort = sortBy === 'name' ? 'executions' : sortBy === 'executions' ? 'lastRun' : 'name';
    setSortBy(nextSort);
    toast.info(`Sorted by: ${nextSort}`);
  };

  const handleFilter = () => {
    setShowFilters(!showFilters);
  };

  const exportRules = () => {
    toast.success('Rules exported to CSV');
  };

  const filteredRules = filterStatus === 'all' 
    ? automationRules 
    : automationRules.filter(rule => rule.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Rule</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRuleName('');
                    setNewRuleDescription('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rule Name</label>
                <Input 
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Enter rule name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Input 
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  placeholder="Enter description"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={createRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRuleName('');
                    setNewRuleDescription('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground mt-2">
            Automate your workflow with custom rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRules}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Running now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,345</div>
            <p className="text-xs text-muted-foreground">+12.3% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>Manage your automated workflows</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleFilter}>
                <FilterIcon className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={handleSort}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Filter by Status:</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button 
                  size="sm" 
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button 
                  size="sm" 
                  variant={filterStatus === 'paused' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('paused')}
                >
                  Paused
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{rule.name}</h4>
                      <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                        {rule.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground">Trigger:</span>
                        <span className="font-medium">{rule.trigger}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Actions:</span>
                        <span className="font-medium">{rule.actions.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                      <span>{rule.executions} executions</span>
                      <span>Last run: {rule.lastRun}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => editRule(rule.id)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleRuleStatus(rule.id)}
                    >
                      {rule.status === 'active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rule Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Rule Templates</CardTitle>
          <CardDescription>Quick start with pre-built templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Lead Nurturing',
                description: 'Automatically nurture leads with email sequences',
                uses: 234,
              },
              {
                name: 'Task Assignment',
                description: 'Assign tasks based on lead status or activity',
                uses: 189,
              },
              {
                name: 'Email Notifications',
                description: 'Send alerts when specific events occur',
                uses: 456,
              },
              {
                name: 'Lead Scoring',
                description: 'Update lead scores based on engagement',
                uses: 312,
              },
              {
                name: 'Follow-up Reminders',
                description: 'Create reminders for inactive leads',
                uses: 178,
              },
              {
                name: 'Status Updates',
                description: 'Auto-update status based on criteria',
                uses: 267,
              },
            ].map((template) => (
              <div
                key={template.name}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <h4 className="font-semibold mb-2">{template.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{template.uses} uses</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => applyTemplate(template.name)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trigger Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Triggers</CardTitle>
          <CardDescription>Events that can start automation rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: 'Lead Created', description: 'When a new lead is added', icon: Plus },
              { name: 'Status Changed', description: 'When lead status is updated', icon: Target },
              { name: 'Email Opened', description: 'When recipient opens email', icon: CheckCircle },
              { name: 'Link Clicked', description: 'When link in email is clicked', icon: Zap },
              { name: 'Form Submitted', description: 'When web form is submitted', icon: CheckCircle },
              { name: 'Schedule', description: 'At specific date/time or interval', icon: Clock },
            ].map((trigger) => (
              <div key={trigger.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                  <trigger.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{trigger.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{trigger.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Actions</CardTitle>
          <CardDescription>What happens when a trigger fires</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: 'Send Email', description: 'Send an email to lead or team member' },
              { name: 'Create Task', description: 'Create a new task with details' },
              { name: 'Assign User', description: 'Assign lead to a team member' },
              { name: 'Update Status', description: 'Change lead status' },
              { name: 'Add Tag', description: 'Add a tag to the lead' },
              { name: 'Update Score', description: 'Modify lead score' },
              { name: 'Send Notification', description: 'Send in-app notification' },
              { name: 'Webhook', description: 'Trigger external webhook' },
            ].map((action) => (
              <div key={action.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{action.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>Latest automation rule activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                rule: 'Welcome New Leads',
                lead: 'John Smith',
                action: 'Sent welcome email',
                time: '2 min ago',
                status: 'success',
              },
              {
                rule: 'Follow-up Qualified Leads',
                lead: 'Sarah Johnson',
                action: 'Created follow-up task',
                time: '15 min ago',
                status: 'success',
              },
              {
                rule: 'Lead Scoring',
                lead: 'Mike Wilson',
                action: 'Updated score to 85',
                time: '1 hour ago',
                status: 'success',
              },
              {
                rule: 'Email Notifications',
                lead: 'Emily Brown',
                action: 'Failed to send notification',
                time: '2 hours ago',
                status: 'failed',
              },
            ].map((execution, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      execution.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{execution.rule}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {execution.lead} • {execution.action}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{execution.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationRules;
