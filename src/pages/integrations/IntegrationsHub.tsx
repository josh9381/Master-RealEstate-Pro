import { Plug, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const IntegrationsHub = () => {
  const integrations = [
    {
      id: 1,
      name: 'Salesforce',
      category: 'CRM',
      description: 'Sync leads and contacts with Salesforce CRM',
      status: 'connected',
      lastSync: '2 minutes ago',
      icon: '🔵',
    },
    {
      id: 2,
      name: 'HubSpot',
      category: 'CRM',
      description: 'Import and export contacts with HubSpot',
      status: 'connected',
      lastSync: '10 minutes ago',
      icon: '🟠',
    },
    {
      id: 3,
      name: 'Mailchimp',
      category: 'Email',
      description: 'Send email campaigns through Mailchimp',
      status: 'available',
      lastSync: null,
      icon: '🐵',
    },
    {
      id: 4,
      name: 'Twilio',
      category: 'SMS',
      description: 'Send SMS messages via Twilio',
      status: 'connected',
      lastSync: '1 hour ago',
      icon: '📱',
    },
    {
      id: 5,
      name: 'Google Sheets',
      category: 'Data',
      description: 'Export data to Google Sheets',
      status: 'connected',
      lastSync: '5 minutes ago',
      icon: '📊',
    },
    {
      id: 6,
      name: 'Slack',
      category: 'Communication',
      description: 'Get notifications in Slack channels',
      status: 'available',
      lastSync: null,
      icon: '💬',
    },
    {
      id: 7,
      name: 'Zapier',
      category: 'Automation',
      description: 'Connect to 3000+ apps via Zapier',
      status: 'available',
      lastSync: null,
      icon: '⚡',
    },
    {
      id: 8,
      name: 'Stripe',
      category: 'Payment',
      description: 'Accept payments and manage subscriptions',
      status: 'error',
      lastSync: 'Failed 1 hour ago',
      icon: '💳',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your favorite tools and services
          </p>
        </div>
        <Button>Browse All Integrations</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Ready to connect</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.4K</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">{integration.icon}</div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                <Badge
                  variant={
                    integration.status === 'connected'
                      ? 'success'
                      : integration.status === 'error'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {integration.status}
                </Badge>
              </div>
              <CardDescription className="mt-2">{integration.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {integration.lastSync && (
                <p className="text-sm text-muted-foreground mb-3">
                  Last sync: {integration.lastSync}
                </p>
              )}
              <div className="flex space-x-2">
                {integration.status === 'connected' ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1">
                      Disconnect
                    </Button>
                  </>
                ) : integration.status === 'error' ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Error
                    </Button>
                    <Button size="sm" className="flex-1">
                      Reconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="w-full">
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API keys for custom integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Production API Key</p>
                <p className="text-sm text-muted-foreground font-mono">
                  sk_prod_••••••••••••1234
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  Copy
                </Button>
                <Button variant="ghost" size="sm">
                  Revoke
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Development API Key</p>
                <p className="text-sm text-muted-foreground font-mono">
                  sk_dev_••••••••••••5678
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  Copy
                </Button>
                <Button variant="ghost" size="sm">
                  Revoke
                </Button>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4">
            Generate New API Key
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsHub;
