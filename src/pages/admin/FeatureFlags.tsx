import { useState } from 'react';
import { Flag, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

const FeatureFlags = () => {
  const { toast } = useToast();
  const [features, setFeatures] = useState([
    {
      id: 1,
      name: 'AI Lead Scoring',
      key: 'ai_lead_scoring',
      description: 'Enable AI-powered lead scoring and predictions',
      enabled: true,
      environment: 'production',
      rollout: 100,
    },
    {
      id: 2,
      name: 'Advanced Analytics',
      key: 'advanced_analytics',
      description: 'Show advanced analytics dashboard and reports',
      enabled: true,
      environment: 'production',
      rollout: 100,
    },
    {
      id: 3,
      name: 'New Campaign Builder',
      key: 'new_campaign_builder',
      description: 'Use redesigned campaign builder interface',
      enabled: true,
      environment: 'beta',
      rollout: 50,
    },
    {
      id: 4,
      name: 'Social Media Integration',
      key: 'social_media_integration',
      description: 'Connect and post to social media platforms',
      enabled: false,
      environment: 'development',
      rollout: 10,
    },
    {
      id: 5,
      name: 'Video Calling',
      key: 'video_calling',
      description: 'Enable in-app video calling feature',
      enabled: false,
      environment: 'development',
      rollout: 0,
    },
    {
      id: 6,
      name: 'Mobile App API v2',
      key: 'mobile_api_v2',
      description: 'Use new mobile API endpoints',
      enabled: true,
      environment: 'production',
      rollout: 75,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<number | null>(null);
  const [newFeature, setNewFeature] = useState({
    name: '',
    key: '',
    description: '',
    environment: 'development' as 'development' | 'beta' | 'production',
    rollout: 0,
    enabled: false,
  });

  const handleToggle = (id: number) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
    const feature = features.find(f => f.id === id);
    toast.success(`${feature?.name} ${feature?.enabled ? 'disabled' : 'enabled'} successfully`);
  };

  const handleEdit = (id: number) => {
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

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this feature flag?')) {
      setFeatures(features.filter(f => f.id !== id));
      toast.success('Feature flag deleted successfully');
    }
  };

  const handleCreate = () => {
    if (!newFeature.name || !newFeature.key) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingFeature) {
      setFeatures(features.map(f =>
        f.id === editingFeature ? { ...f, ...newFeature } : f
      ));
      toast.success('Feature flag updated successfully');
    } else {
      const newId = Math.max(...features.map(f => f.id)) + 1;
      setFeatures([...features, { id: newId, ...newFeature }]);
      toast.success('Feature flag created successfully');
    }

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
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground mt-2">
            Control feature rollouts and experiments
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Feature Flag
        </Button>
      </div>

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
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      feature.enabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Flag
                      className={`h-5 w-5 ${
                        feature.enabled ? 'text-green-600' : 'text-gray-400'
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Feature Key</label>
                <input
                  type="text"
                  placeholder="e.g., new_dashboard"
                  value={newFeature.key}
                  onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                className="w-full min-h-[80px] p-2 border rounded-md"
                placeholder="Describe what this feature does..."
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Environment</label>
                <select 
                  className="w-full p-2 border rounded-md"
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
                  className="w-full p-2 border rounded-md" 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Initial State</label>
                <select 
                  className="w-full p-2 border rounded-md"
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
              <Button 
                variant="outline" 
                onClick={() => {
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
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeatureFlags;
