import { Settings, Database, Zap, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const ServiceConfiguration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Service Configuration</h1>
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
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17,450</div>
            <p className="text-xs text-muted-foreground">Within limits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Uptime</p>
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
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="s3">
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
                defaultValue="AKIA••••••••••••MPLE"
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Secret Access Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••"
                defaultValue="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
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
                defaultValue="yourcrm-storage"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Region</label>
              <select className="w-full px-3 py-2 border rounded-lg" defaultValue="us-east-1">
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
          </div>
          <Button>Save Storage Settings</Button>
        </CardContent>
      </Card>

      {/* Cache Service */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Service</CardTitle>
          <CardDescription>Redis configuration for caching and sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Cache Provider</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="redis">
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
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Redis Port</label>
              <input
                type="number"
                placeholder="6379"
                defaultValue="6379"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Redis Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              className="w-full px-3 py-2 border rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cache TTL (seconds)</label>
            <input
              type="number"
              placeholder="3600"
              defaultValue="3600"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button>Save Cache Settings</Button>
            <Button variant="outline">Flush Cache</Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Service */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Service</CardTitle>
          <CardDescription>Background job processing configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Queue Provider</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="redis">
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
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Max Retries</label>
              <input
                type="number"
                placeholder="3"
                defaultValue="3"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Retry Delay (seconds)</label>
              <input
                type="number"
                placeholder="60"
                defaultValue="60"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <Button>Save Queue Settings</Button>
        </CardContent>
      </Card>

      {/* Search Service */}
      <Card>
        <CardHeader>
          <CardTitle>Search Service</CardTitle>
          <CardDescription>Elasticsearch configuration for advanced search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable Elasticsearch</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Elasticsearch URL</label>
            <input
              type="text"
              placeholder="http://localhost:9200"
              defaultValue="https://search.yourcrm.com:9200"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <input
                type="text"
                placeholder="elastic"
                defaultValue="elastic"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Index Prefix</label>
            <input
              type="text"
              placeholder="crm_"
              defaultValue="crm_"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button>Save Search Settings</Button>
            <Button variant="outline">Reindex All Data</Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Service */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Service</CardTitle>
          <CardDescription>Google Analytics and tracking configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable Analytics Tracking</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Google Analytics ID</label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
              defaultValue="G-ABC123XYZ"
              className="w-full px-3 py-2 border rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">GTM Container ID (Optional)</label>
            <input
              type="text"
              placeholder="GTM-XXXXXXX"
              className="w-full px-3 py-2 border rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track page views</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track user events</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Anonymize IP addresses</span>
            </label>
          </div>
          <Button>Save Analytics Settings</Button>
        </CardContent>
      </Card>

      {/* Monitoring Service */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring & Error Tracking</CardTitle>
          <CardDescription>Sentry and monitoring configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable Error Tracking</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Sentry DSN</label>
            <input
              type="text"
              placeholder="https://xxxxx@sentry.io/xxxxx"
              defaultValue="https://abc123@o123456.ingest.sentry.io/7654321"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Environment</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="production">
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
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <Button>Save Monitoring Settings</Button>
        </CardContent>
      </Card>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Status</CardTitle>
          <CardDescription>Current status of all configured services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { service: 'Storage Service (S3)', status: 'operational', latency: '45ms' },
              { service: 'Cache Service (Redis)', status: 'operational', latency: '2ms' },
              { service: 'Queue Service (Redis)', status: 'operational', latency: '3ms' },
              { service: 'Search Service (Elasticsearch)', status: 'operational', latency: '12ms' },
              { service: 'Analytics Service (GA)', status: 'operational', latency: '120ms' },
              { service: 'Monitoring (Sentry)', status: 'operational', latency: '89ms' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                    <Settings className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{item.service}</p>
                    <p className="text-xs text-muted-foreground">Latency: {item.latency}</p>
                  </div>
                </div>
                <Badge variant="success">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceConfiguration;
