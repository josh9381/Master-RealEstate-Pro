import { useState } from 'react';
import { Flag, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  environment: string;
  rollout: number;
}

const FeatureFlags = () => {
  const { toast } = useToast();
  const showConfirm = useConfirm();
  const queryClient = useQueryClient();

  const { data: features = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: async () => {
      const res = await api.get('/api/admin/feature-flags');
      return (res.data?.data || res.data) as FeatureFlag[];
    },
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState({
    name: '',
    key: '',
    description: '',
    environment: 'development' as 'development' | 'beta' | 'production',
    rollout: 0,
    enabled: false,
  });

  const handleToggle = (id: string) => {
    const feature = features.find(f => f.id === id);
    if (!feature) return;
    toggleMutation.mutate({ id, enabled: !feature.enabled });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await api.put(`/api/admin/feature-flags/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
    },
    onError: () => {
      toast.error('Failed to toggle feature flag');
    },
  });

  const handleEdit = (id: string) => {
      const feature = features.find(f => f.id === id);
    if (feature) {
      setEditingFeature(id);
      setNewFeature({
        name: feature.name,
        key: feature.key,
        description: feature.description,
        environment: feature.environment as 'development' | 'beta' | 'production',
        rollout: feature.rollout,
        enabled: feature.enabled,
      });
      setShowCreateModal(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm({ title: 'Delete Feature Flag', message: 'Are you sure you want to delete this feature flag?', confirmLabel: 'Delete', variant: 'destructive' })) {
      deleteMutation.mutate(id);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/feature-flags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Feature flag deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete feature flag');
    },
  });

  const handleCreate = () => {
    if (!newFeature.name || !newFeature.key) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature, data: newFeature });
    } else {
      createMutation.mutate(newFeature);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newFeature) => {
      await api.post('/api/admin/feature-flags', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Feature flag created successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create feature flag');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof newFeature }) => {
      await api.put(`/api/admin/feature-flags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success('Feature flag updated successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    },
  });

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingFeature(null);
    setNewFeature({
      name: '',
      key: '',
      description: '',
      environment: 'development',
      rollout: 0,
      enabled: false,
    });
  };

  const totalFlags = features.length;
  const enabledFlags = features.filter(f => f.enabled).length;
  const productionFlags = features.filter(f => f.environment === 'production').length;
  const developmentFlags = features.filter(f => f.environment === 'development').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feature Flags</h1>
          <p className="text-muted-foreground mt-2">
            Control feature rollouts and experiments
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Feature Flag
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <ErrorBanner message="Failed to load feature flags" retry={refetch} />
      ) : (
      <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFlags}</div>
            <p className="text-xs text-muted-foreground">Active features</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledFlags}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Production</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionFlags}</div>
            <p className="text-xs text-muted-foreground">Live for users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Development</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{developmentFlags}</div>
            <p className="text-xs text-muted-foreground">Testing phase</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags List */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Manage and toggle feature availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      feature.enabled ? 'bg-success/10' : 'bg-muted'
                    }`}
                  >
                    <Flag
                      className={`h-5 w-5 ${
                        feature.enabled ? 'text-success' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{feature.name}</h4>
                      <Badge
                        variant={feature.enabled ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {feature.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge
                        variant={
                          feature.environment === 'production'
                            ? 'default'
                            : feature.environment === 'beta'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {feature.environment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Key: {feature.key}</span>
                      <span>Rollout: {feature.rollout}%</span>
                    </div>
                    {feature.enabled && feature.rollout < 100 && (
                      <div className="mt-2">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${feature.rollout}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={() => handleToggle(feature.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-200 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(feature.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(feature.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Flag */}
      {showCreateModal && (
        <Card>
          <CardHeader>
            <CardTitle>{editingFeature ? 'Edit' : 'Create New'} Feature Flag</CardTitle>
            <CardDescription>
              {editingFeature ? 'Update the feature flag' : 'Add a new feature flag to control rollouts'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Feature Name</label>
                <input
                  type="text"
                  placeholder="e.g., New Dashboard"
                  value={newFeature.name}
                  onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                  className="w-full p-2 border rounded-md transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Feature Key</label>
                <input
                  type="text"
                  placeholder="e.g., new_dashboard"
                  value={newFeature.key}
                  onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value })}
                  className="w-full p-2 border rounded-md transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                className="w-full min-h-[80px] p-2 border rounded-md transition-colors"
                placeholder="Describe what this feature does..."
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Environment</label>
                <select 
                  className="w-full p-2 border rounded-md transition-colors"
                  value={newFeature.environment}
                  onChange={(e) => setNewFeature({ ...newFeature, environment: e.target.value as 'development' | 'beta' | 'production' })}
                >
                  <option value="development">development</option>
                  <option value="beta">beta</option>
                  <option value="production">production</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Rollout %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={newFeature.rollout}
                  onChange={(e) => setNewFeature({ ...newFeature, rollout: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-md transition-colors" 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Initial State</label>
                <select 
                  className="w-full p-2 border rounded-md transition-colors"
                  value={newFeature.enabled ? 'Enabled' : 'Disabled'}
                  onChange={(e) => setNewFeature({ ...newFeature, enabled: e.target.value === 'Enabled' })}
                >
                  <option>Disabled</option>
                  <option>Enabled</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {editingFeature ? 'Update' : 'Create'} Feature Flag
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
};

export default FeatureFlags;
