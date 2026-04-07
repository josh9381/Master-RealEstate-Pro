import { logger } from '@/lib/logger'
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Cpu, HardDrive, Network, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { adminApi } from '@/lib/api';
import { calcRate } from '@/lib/metricsCalculator';

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'checking';
  latency: string;
  uptime: string;
}

const defaultServices: ServiceHealth[] = [
  { name: 'Database', status: 'checking', latency: '—', uptime: '—' },
  { name: 'API Server', status: 'checking', latency: '—', uptime: '—' },
  { name: 'Cache (Redis)', status: 'checking', latency: '—', uptime: '—' },
  { name: 'Email Service', status: 'checking', latency: '—', uptime: '—' },
  { name: 'Storage (S3)', status: 'checking', latency: '—', uptime: '—' },
  { name: 'Search (Elasticsearch)', status: 'checking', latency: '—', uptime: '—' },
];

const HealthCheckDashboard = () => {
  const { toast } = useToast();

  const { data: services = defaultServices, isFetching: isRefreshing, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      try {
        const response = await adminApi.healthCheck();
        const data = response.data || response;
        if (data.services && Array.isArray(data.services)) {
          return data.services as ServiceHealth[];
        }
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } }
        if (err?.response?.status !== 404) {
          logger.error('Health check failed:', error);
        }
      }
      return defaultServices;
    },
    refetchInterval: AUTO_REFRESH_INTERVAL,
  });

  // Fetch real admin stats for the key metrics cards
  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats-health'],
    queryFn: async () => {
      try {
        const response = await adminApi.getStats();
        return response.data || response;
      } catch {
        return null;
      }
    },
    refetchInterval: AUTO_REFRESH_INTERVAL,
  });

  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();

  const handleRefresh = () => {
    toast.info('Refreshing health checks...');
    refetch();
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const checkingCount = services.filter(s => s.status === 'checking').length;

  const overallStatus = downCount > 0 ? 'degraded' : degradedCount > 0 ? 'partial' : checkingCount === services.length ? 'checking' : 'operational';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system status and performance • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`${overallStatus === 'operational' ? 'border-green-200 bg-green-50' : overallStatus === 'checking' ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center h-16 w-16 rounded-full ${overallStatus === 'operational' ? 'bg-green-600' : overallStatus === 'checking' ? 'bg-gray-400' : 'bg-orange-600'}`}>
              {overallStatus === 'checking' ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : overallStatus === 'operational' ? (
                <CheckCircle className="h-8 w-8 text-white" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">
                {overallStatus === 'checking' ? 'Checking Services...' : overallStatus === 'operational' ? 'System Operational' : 'System Issues Detected'}
              </h3>
              <p className="mt-1 text-muted-foreground">
                {healthyCount} healthy, {degradedCount} degraded, {downCount} down{checkingCount > 0 ? `, ${checkingCount} checking` : ''}.
                Auto-refreshes every 30s.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics — populated from real admin stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.systemHealth?.uptime ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Process uptime</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.systemHealth?.apiResponseTime != null ? `${adminStats.systemHealth.apiResponseTime}ms` : '—'}</div>
            <p className="text-xs text-muted-foreground">DB ping latency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.systemHealth?.errorRate ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.activeSessions ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Health status of all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-lg ${
                      service.status === 'healthy'
                        ? 'bg-green-100'
                        : service.status === 'degraded'
                        ? 'bg-orange-100'
                        : service.status === 'checking'
                        ? 'bg-gray-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : service.status === 'degraded' ? (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    ) : service.status === 'checking' ? (
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Latency: {service.latency} • Uptime: {service.uptime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      service.status === 'healthy'
                        ? 'default'
                        : service.status === 'degraded'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {service.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Usage — derived from real stats */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>Current system resource consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const storage = adminStats?.stats?.storageUsed;
              const storageNum = storage ? parseFloat(storage) : 0;
              const resources = [
                { name: 'Database Storage', value: storageNum, max: 10, unit: 'GB', icon: Database },
                { name: 'Total Messages', value: adminStats?.stats?.totalMessages ?? 0, max: Math.max(adminStats?.stats?.totalMessages ?? 0, 100000), unit: '', icon: HardDrive },
                { name: 'API Calls (24h)', value: adminStats?.stats?.apiCalls ?? 0, max: Math.max(adminStats?.stats?.apiCalls ?? 0, 10000), unit: '', icon: Network },
                { name: 'Active Sessions', value: adminStats?.activeSessions ?? 0, max: Math.max(adminStats?.stats?.totalUsers ?? 1, 1), unit: 'users', icon: Cpu },
              ];
              return resources.map((resource) => (
                <div key={resource.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <resource.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{resource.name}</span>
                    </div>
                    <span className="text-sm">
                      {typeof resource.value === 'number' ? resource.value.toLocaleString() : resource.value}{resource.unit ? ` ${resource.unit}` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        calcRate(resource.value, resource.max, 0) > 80
                          ? 'bg-red-600'
                          : calcRate(resource.value, resource.max, 0) > 60
                          ? 'bg-orange-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(calcRate(resource.value, resource.max, 0), 100)}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents — derived from degraded/down services */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>System events detected from health checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(() => {
              const incidents = services
                .filter((s) => s.status === 'degraded' || s.status === 'down')
                .map((s) => ({
                  title: `${s.name} ${s.status === 'down' ? 'Outage' : 'Degradation'}`,
                  description: `${s.name} is ${s.status}. Latency: ${s.latency}`,
                  severity: s.status === 'down' ? 'critical' : 'warning',
                  status: 'detected',
                }));
              if (incidents.length === 0) {
                return (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No incidents detected. All services are healthy.</p>
                  </div>
                );
              }
              return incidents.map((incident) => (
                <div key={incident.title} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`h-2 w-2 rounded-full mt-2 ${
                        incident.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                      }`}
                    />
                    <div>
                      <h4 className="font-semibold text-sm">{incident.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline">{incident.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* System Information — real values from admin stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Server and application details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{adminStats?.organization?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subscription Tier</span>
                <span className="font-medium">{adminStats?.organization?.subscriptionTier ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database Health</span>
                <Badge variant={adminStats?.systemHealth?.database === 'healthy' ? 'default' : 'destructive'}>
                  {adminStats?.systemHealth?.database ?? '—'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Backup</span>
                <span className="font-medium">
                  {adminStats?.stats?.lastBackup
                    ? new Date(adminStats.stats.lastBackup).toLocaleString()
                    : 'No backups yet'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-medium">{adminStats?.stats?.totalUsers?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Leads</span>
                <span className="font-medium">{adminStats?.stats?.totalLeads?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">API Calls (24h)</span>
                <span className="font-medium">{adminStats?.stats?.apiCalls?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">{adminStats?.stats?.storageUsed ?? '—'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Check Endpoints — derived from real service health probes */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Endpoints</CardTitle>
          <CardDescription>Live probe results from the health API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg font-mono">
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={service.status === 'healthy' ? 'default' : service.status === 'degraded' ? 'secondary' : 'destructive'}
                  >
                    {service.status === 'healthy' ? '200' : service.status === 'degraded' ? '200' : '503'}
                  </Badge>
                  <span className="text-sm">{service.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{service.latency}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthCheckDashboard;
