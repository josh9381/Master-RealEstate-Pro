import { useState, useEffect } from 'react';
import { Zap, Plus, Clock, Target, CheckCircle, X, Edit2, Trash2, Pause, Play, Filter as FilterIcon, ArrowUpDown, Download, RefreshCw, Mail, Bell, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { workflowsApi } from '@/lib/api';

const AutomationRules = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'executions' | 'lastRun'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Bulk actions state
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'pause' | 'delete'>('activate');

  // Stats state
  const [stats, setStats] = useState({
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: 0,
    timeSaved: 0
  });

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

  useEffect(() => {
    loadRules();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reload when debounced search or filters change
  useEffect(() => {
    if (debouncedSearch !== '' || filterStatus !== 'all') {
      loadRules();
    }
  }, [debouncedSearch, filterStatus]);

  const loadRules = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Build query params
      const params: any = { type: 'automation' };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterStatus !== 'all') {
        params.isActive = filterStatus === 'active';
      }

      const [workflowsResponse, statsResponse] = await Promise.all([
        workflowsApi.getWorkflows(params),
        workflowsApi.getStats()
      ]);
      
      if (workflowsResponse && Array.isArray(workflowsResponse)) {
        setAutomationRules(workflowsResponse);
      }

      if (statsResponse?.data) {
        setStats({
          activeWorkflows: statsResponse.data.activeWorkflows || 0,
          totalExecutions: statsResponse.data.totalExecutions || 0,
          successRate: statsResponse.data.successRate || 0,
          timeSaved: Math.round((statsResponse.data.successfulExecutions || 0) * 0.05) // Estimate 3 min saved per execution
        });
      }
    } catch (error) {
      console.error('Failed to load automation rules:', error);
      toast.error('Failed to load rules, using sample data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadRules(true);
  };

  const toggleRuleStatus = async (ruleId: number) => {
    try {
      const currentRule = automationRules.find(rule => rule.id === ruleId);
      const newActiveState = currentRule?.status !== 'active';
      await workflowsApi.toggleWorkflow(ruleId.toString(), newActiveState);
      
      setAutomationRules(automationRules.map(rule => 
        rule.id === ruleId 
          ? { ...rule, status: rule.status === 'active' ? 'paused' as const : 'active' as const }
          : rule
      ));
      const rule = automationRules.find(r => r.id === ruleId);
      if (rule) {
        toast.success(`Rule ${rule.status === 'active' ? 'paused' : 'activated'}`);
      }
      
      await loadRules(true);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to toggle rule status');
    }
  };

  const deleteRule = async (ruleId: number) => {
    try {
      await workflowsApi.deleteWorkflow(ruleId.toString());
      setAutomationRules(automationRules.filter(rule => rule.id !== ruleId));
      toast.success('Rule deleted successfully');
      await loadRules(true);
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedRules.length === automationRules.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(automationRules.map(rule => rule.id));
    }
  };

  const toggleSelectRule = (ruleId: number) => {
    if (selectedRules.includes(ruleId)) {
      setSelectedRules(selectedRules.filter(id => id !== ruleId));
    } else {
      setSelectedRules([...selectedRules, ruleId]);
    }
  };

  const handleBulkAction = (action: 'activate' | 'pause' | 'delete') => {
    if (selectedRules.length === 0) {
      toast.error('Please select at least one workflow');
      return;
    }
    setBulkAction(action);
    setShowBulkConfirm(true);
  };

  const executeBulkAction = async () => {
    try {
      const actionLabel = bulkAction === 'activate' ? 'activated' : bulkAction === 'pause' ? 'paused' : 'deleted';
      
      if (bulkAction === 'delete') {
        // Delete selected workflows
        await Promise.all(
          selectedRules.map(ruleId => workflowsApi.deleteWorkflow(ruleId.toString()))
        );
        setAutomationRules(automationRules.filter(rule => !selectedRules.includes(rule.id)));
      } else {
        // Activate or pause workflows
        const isActive = bulkAction === 'activate';
        await Promise.all(
          selectedRules.map(ruleId => workflowsApi.toggleWorkflow(ruleId.toString(), isActive))
        );
        setAutomationRules(automationRules.map(rule => 
          selectedRules.includes(rule.id) 
            ? { ...rule, status: isActive ? 'active' as const : 'paused' as const }
            : rule
        ));
      }
      
      toast.success(`${selectedRules.length} workflow(s) ${actionLabel} successfully`);
      setSelectedRules([]);
      setShowBulkConfirm(false);
      await loadRules(true);
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const editRule = (ruleId: number) => {
    // Navigate to workflow builder with the rule ID
    window.location.href = `/workflows/builder?id=${ruleId}`;
  };

  const createRule = async () => {
    if (!newRuleName.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    
    try {
      const newRuleData = {
        name: newRuleName,
        description: newRuleDescription || 'No description',
        trigger: 'Lead Created',
        actions: ['Send Email'],
        status: 'active'
      };
      
      await workflowsApi.createWorkflow(newRuleData);
      
      const newRule = {
        id: Math.max(...automationRules.map(r => r.id)) + 1,
        ...newRuleData,
        status: 'active' as const,
        executions: 0,
        lastRun: 'Never',
      };
      
      setAutomationRules([...automationRules, newRule]);
      toast.success('Rule created successfully');
      setShowCreateModal(false);
      setNewRuleName('');
      setNewRuleDescription('');
      
      await loadRules(true);
    } catch (error) {
      console.error('Failed to create rule:', error);
      toast.error('Failed to create rule');
    }
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

  // No need for client-side filtering anymore - done on backend
  const filteredRules = automationRules;

  return (
    <div className="space-y-6">
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading automation rules...</p>
          </div>
        </Card>
      ) : (
        <>
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
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Automation Rules</h1>
            <Badge variant="outline" className="text-xs">Smart Automation</Badge>
          </div>
          <p className="text-muted-foreground">
            Create intelligent rules to automate your workflow and save time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search workflows by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Tips Banner */}
      {automationRules.length > 0 && automationRules.length < 3 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Automation Pro Tips ✨</h3>
                <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Start simple - add one trigger and one action</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Test your rules before activating them</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Monitor execution logs regularly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Use templates to save time</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Running now</p>
            <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 animate-pulse" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total executions</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.successRate >= 95 ? 'Excellent!' : stats.successRate >= 80 ? 'Good' : 'Needs attention'}
            </p>
            <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.timeSaved}h</div>
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

          {/* Bulk Action Bar */}
          {selectedRules.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedRules.length} workflow{selectedRules.length > 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedRules([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Activate All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('pause')}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All
                </Button>
              </div>
            </div>
          )}

          {/* Select All Checkbox */}
          {filteredRules.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 border-b">
              <input 
                type="checkbox"
                checked={selectedRules.length === automationRules.length && automationRules.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4"
              />
              <label className="text-sm font-medium">Select All</label>
            </div>
          )}

          <div className="space-y-4">
            {filteredRules.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg">
                <div className="p-6 bg-primary/10 rounded-full w-fit mx-auto mb-6">
                  <Zap className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No workflows found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters to find what you\'re looking for' 
                    : 'Create your first workflow to automate repetitive tasks and boost productivity'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <div className="space-y-4">
                    <Button onClick={() => setShowCreateModal(true)} size="lg" className="shadow-lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Workflow
                    </Button>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span>or</span>
                      <Button variant="outline" size="sm" onClick={() => applyTemplate('Lead Nurturing')}>
                        <Zap className="h-4 w-4 mr-1" />
                        Try a Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              filteredRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input 
                      type="checkbox"
                      checked={selectedRules.includes(rule.id)}
                      onChange={() => toggleSelectRule(rule.id)}
                      className="h-4 w-4 mt-1"
                    />
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
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rule Templates */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Rule Templates
              </CardTitle>
              <CardDescription className="mt-1">Quick start with pre-built templates</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">Popular</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Lead Nurturing',
                description: 'Automatically nurture leads with email sequences',
                uses: 234,
                icon: Mail,
                color: 'blue'
              },
              {
                name: 'Task Assignment',
                description: 'Assign tasks based on lead status or activity',
                uses: 189,
                icon: CheckCircle,
                color: 'green'
              },
              {
                name: 'Email Notifications',
                description: 'Send alerts when specific events occur',
                uses: 456,
                icon: Bell,
                color: 'purple'
              },
              {
                name: 'Lead Scoring',
                description: 'Update lead scores based on engagement',
                uses: 312,
                icon: TrendingUp,
                color: 'orange'
              },
              {
                name: 'Follow-up Reminders',
                description: 'Create reminders for inactive leads',
                uses: 178,
                icon: Clock,
                color: 'pink'
              },
              {
                name: 'Status Updates',
                description: 'Auto-update status based on criteria',
                uses: 267,
                icon: Target,
                color: 'indigo'
              },
            ].map((template) => (
              <div
                key={template.name}
                className="group p-5 border rounded-lg cursor-pointer hover:border-primary hover:shadow-lg transition-all bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 bg-${template.color}-100 dark:bg-${template.color}-900 rounded-lg group-hover:scale-110 transition-transform`}>
                    <template.icon className={`h-5 w-5 text-${template.color}-600 dark:text-${template.color}-400`} />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {template.uses} uses
                  </Badge>
                </div>
                <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">{template.name}</h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                  onClick={() => applyTemplate(template.name)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Use Template
                </Button>
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
        </>
      )}

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Bulk {bulkAction === 'activate' ? 'Activation' : bulkAction === 'pause' ? 'Pause' : 'Deletion'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'delete' 
                ? `Are you sure you want to delete ${selectedRules.length} workflow(s)? This action cannot be undone.`
                : `Are you sure you want to ${bulkAction} ${selectedRules.length} workflow(s)?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeBulkAction}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomationRules;
