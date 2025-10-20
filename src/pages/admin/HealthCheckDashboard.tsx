import { Activity, Database, Cpu, HardDrive, Network, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const HealthCheckDashboard = () => {
  const services = [
    { name: 'Database', status: 'healthy', latency: '12ms', uptime: '99.9%' },
    { name: 'API Server', status: 'healthy', latency: '45ms', uptime: '99.8%' },
    { name: 'Cache (Redis)', status: 'healthy', latency: '2ms', uptime: '100%' },
    { name: 'Email Service', status: 'degraded', latency: '234ms', uptime: '98.5%' },
    { name: 'Storage (S3)', status: 'healthy', latency: '67ms', uptime: '99.95%' },
    { name: 'Search (Elasticsearch)', status: 'down', latency: 'N/A', uptime: '85.2%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system status and performance
          </p>
        </div>
        <Button>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-600">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-900">System Operational</h3>
              <p className="text-green-800 mt-1">
                All core services are running. 1 service degraded, 1 service down.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234ms</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.12%</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58</div>
            <p className="text-xs text-muted-foreground">Online now</p>
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
                        : 'bg-red-100'
                    }`}
                  >
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : service.status === 'degraded' ? (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
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

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>Current system resource consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'CPU Usage', value: 45, max: 100, unit: '%', icon: Cpu },
              { name: 'Memory Usage', value: 6.4, max: 16, unit: 'GB', icon: HardDrive },
              { name: 'Disk Usage', value: 234, max: 500, unit: 'GB', icon: Database },
              { name: 'Network I/O', value: 12.3, max: 100, unit: 'Mbps', icon: Network },
            ].map((resource) => (
              <div key={resource.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <resource.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{resource.name}</span>
                  </div>
                  <span className="text-sm">
                    {resource.value} / {resource.max} {resource.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (resource.value / resource.max) * 100 > 80
                        ? 'bg-red-600'
                        : (resource.value / resource.max) * 100 > 60
                        ? 'bg-orange-600'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${(resource.value / resource.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>System events and issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                title: 'Email Service Degradation',
                description: 'SMTP server experiencing high latency',
                severity: 'warning',
                time: '15 min ago',
                status: 'investigating',
              },
              {
                title: 'Search Service Outage',
                description: 'Elasticsearch cluster unreachable',
                severity: 'critical',
                time: '1 hour ago',
                status: 'investigating',
              },
              {
                title: 'Database Connection Spike',
                description: 'Temporary increase in connection pool usage',
                severity: 'info',
                time: '3 hours ago',
                status: 'resolved',
              },
            ].map((incident, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <div
                    className={`h-2 w-2 rounded-full mt-2 ${
                      incident.severity === 'critical'
                        ? 'bg-red-500'
                        : incident.severity === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-semibold text-sm">{incident.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{incident.status}</Badge>
                      <span className="text-xs text-muted-foreground">{incident.time}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Server and application details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Application Version</span>
                <span className="font-medium">v2.4.1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database Version</span>
                <span className="font-medium">PostgreSQL 14.5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redis Version</span>
                <span className="font-medium">7.0.5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Node.js Version</span>
                <span className="font-medium">v18.17.1</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Server Region</span>
                <span className="font-medium">us-east-1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Deploy</span>
                <span className="font-medium">3 days ago</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Requests</span>
                <span className="font-medium">1,234,567</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="default">Production</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Check Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Endpoints</CardTitle>
          <CardDescription>API endpoints for monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { endpoint: '/api/health', status: 200, response: '23ms' },
              { endpoint: '/api/health/db', status: 200, response: '12ms' },
              { endpoint: '/api/health/cache', status: 200, response: '2ms' },
              { endpoint: '/api/health/storage', status: 200, response: '67ms' },
              { endpoint: '/api/health/search', status: 503, response: 'N/A' },
            ].map((endpoint) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg font-mono">
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={endpoint.status === 200 ? 'default' : 'destructive'}
                  >
                    {endpoint.status}
                  </Badge>
                  <span className="text-sm">{endpoint.endpoint}</span>
                </div>
                <span className="text-xs text-muted-foreground">{endpoint.response}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthCheckDashboard;
