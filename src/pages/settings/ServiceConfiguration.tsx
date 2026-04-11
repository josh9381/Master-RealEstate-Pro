import { Database, Zap, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const ServiceConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testingConnection, setTestingConnection] = useState(false);
  const [storageProvider, setStorageProvider] = useState('s3');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('us-east-1');

  const { data: serviceData } = useQuery({
    queryKey: ['settings', 'serviceConfig'],
    queryFn: async () => {
      const settings = await settingsApi.getBusinessSettings();
      const data = settings?.data || settings;
      return data;
    },
  });

  // Sync fetched data into form state
  useEffect(() => {
    if (serviceData) {
      if (serviceData.storageProvider) setStorageProvider(serviceData.storageProvider);
      if (serviceData.accessKeyId) setAccessKeyId(serviceData.accessKeyId);
      if (serviceData.secretAccessKey) setSecretAccessKey(serviceData.secretAccessKey);
      if (serviceData.bucketName) setBucketName(serviceData.bucketName);
      if (serviceData.region) setRegion(serviceData.region);
    }
  }, [serviceData]);

  const saveMutation = useMutation({
    mutationFn: async (data: { storageProvider: string; accessKeyId: string; secretAccessKey: string; bucketName: string; region: string }) => {
      return await settingsApi.updateServiceConfig('storage', data);
    },
    onSuccess: () => {
      toast.success('Settings Saved', 'Service configuration has been updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['settings', 'serviceConfig'] });
    },
    onError: () => {
      toast.error('Error', 'Failed to save service configuration.');
    },
  });

  const handleSaveSettings = () => {
    saveMutation.mutate({
      storageProvider,
      accessKeyId,
      secretAccessKey,
      bucketName,
      region,
    });
  };

  const handleTestConnection = async (service: string) => {
    setTestingConnection(true);
    try {
      await settingsApi.testServiceConnection(service.toLowerCase());
      toast.success('Connection Successful', `Successfully connected to ${service}.`);
    } catch (error) {
      toast.error('Connection Failed', `Unable to connect to ${service}.`);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">Service Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure external services and API integrations
        </p>
      </div>

      {/* Services Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Services</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Configure below</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Not tracked yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Not configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No services active</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Service */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Service</CardTitle>
          <CardDescription>Cloud storage configuration for files and attachments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Storage Provider</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg" 
              value={storageProvider}
              onChange={(e) => setStorageProvider(e.target.value)}
            >
              <option value="local">Local Storage</option>
              <option value="s3">Amazon S3</option>
              <option value="azure">Azure Blob Storage</option>
              <option value="gcs">Google Cloud Storage</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Access Key ID</label>
              <input
                type="text"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Secret Access Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Bucket Name</label>
              <input
                type="text"
                placeholder="my-crm-bucket"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Region</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSaveSettings} loading={saveMutation.isPending}>Save Storage Settings</Button>
            <Button variant="outline" onClick={() => handleTestConnection('Storage')} loading={testingConnection} disabled={!accessKeyId || !bucketName}>Test Connection</Button>
          </div>
          <p className="text-xs text-muted-foreground">Save your credentials before testing the connection.</p>
        </CardContent>
      </Card>

      {/* Cache Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cache Service</CardTitle>
              <CardDescription>Redis configuration for caching and sessions</CardDescription>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Cache Provider</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted" defaultValue="redis" disabled>
              <option value="memory">In-Memory</option>
              <option value="redis">Redis</option>
              <option value="memcached">Memcached</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Redis Host</label>
              <input
                type="text"
                placeholder="localhost"
                defaultValue="redis.yourcrm.com"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Redis Port</label>
              <input
                type="number"
                placeholder="6379"
                defaultValue="6379"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Redis Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              disabled
              className="w-full px-3 py-2 border rounded-lg font-mono bg-muted"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cache TTL (seconds)</label>
            <input
              type="number"
              placeholder="3600"
              defaultValue="3600"
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted"
            />
          </div>
          <p className="text-xs text-muted-foreground italic">Cache configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* Queue Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue Service</CardTitle>
              <CardDescription>Background job processing configuration</CardDescription>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Queue Provider</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted" defaultValue="redis" disabled>
              <option value="database">Database</option>
              <option value="redis">Redis</option>
              <option value="sqs">Amazon SQS</option>
              <option value="rabbitmq">RabbitMQ</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Default Queue</label>
            <input
              type="text"
              placeholder="default"
              defaultValue="default"
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Max Retries</label>
              <input
                type="number"
                placeholder="3"
                defaultValue="3"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Retry Delay (seconds)</label>
              <input
                type="number"
                placeholder="60"
                defaultValue="60"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">Queue configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* Search Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Service</CardTitle>
              <CardDescription>Elasticsearch configuration for advanced search</CardDescription>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed mb-4">
              <input type="checkbox" defaultChecked disabled className="rounded" />
              <span className="text-sm font-medium text-muted-foreground">Enable Elasticsearch</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Elasticsearch URL</label>
            <input
              type="text"
              placeholder="http://localhost:9200"
              defaultValue="https://search.yourcrm.com:9200"
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <input
                type="text"
                placeholder="elastic"
                defaultValue="elastic"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                disabled
                className="w-full px-3 py-2 border rounded-lg font-mono bg-muted"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Index Prefix</label>
            <input
              type="text"
              placeholder="crm_"
              defaultValue="crm_"
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted"
            />
          </div>
          <p className="text-xs text-muted-foreground italic">Search configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* Analytics Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics Service</CardTitle>
              <CardDescription>Google Analytics and tracking configuration</CardDescription>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed mb-4">
              <input type="checkbox" defaultChecked disabled className="rounded" />
              <span className="text-sm font-medium text-muted-foreground">Enable Analytics Tracking</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Google Analytics ID</label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
              disabled
              className="w-full px-3 py-2 border rounded-lg font-mono bg-muted"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">GTM Container ID (Optional)</label>
            <input
              type="text"
              placeholder="GTM-XXXXXXX"
              disabled
              className="w-full px-3 py-2 border rounded-lg font-mono bg-muted"
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed">
              <input type="checkbox" defaultChecked disabled className="rounded" />
              <span className="text-sm text-muted-foreground">Track page views</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed">
              <input type="checkbox" defaultChecked disabled className="rounded" />
              <span className="text-sm text-muted-foreground">Track user events</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm text-muted-foreground">Anonymize IP addresses</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground italic">Analytics configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* Monitoring Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monitoring & Error Tracking</CardTitle>
              <CardDescription>Sentry and monitoring configuration</CardDescription>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-not-allowed mb-4">
              <input type="checkbox" defaultChecked disabled className="rounded" />
              <span className="text-sm font-medium text-muted-foreground">Enable Error Tracking</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Sentry DSN</label>
            <input
              type="text"
              placeholder="https://xxxxx@sentry.io/xxxxx"
              disabled
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm bg-muted"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Environment</label>
            <select className="w-full px-3 py-2 border rounded-lg bg-muted" defaultValue="production" disabled>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Sample Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="100"
              defaultValue="100"
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-muted"
            />
          </div>
          <p className="text-xs text-muted-foreground italic">Monitoring configuration will be available in a future update.</p>
        </CardContent>
      </Card>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Status</CardTitle>
          <CardDescription>Current status of all configured services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Service health monitoring will be available once services are configured and connected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceConfiguration;
