import { logger } from '@/lib/logger'
import { Plug, CheckCircle, AlertCircle, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

const IntegrationsHub = () => {
  // Real API status checks (ported from old Integrations.tsx)
  const { data: integrationStatus } = useQuery({
    queryKey: ['settings', 'integrations', 'status'],
    queryFn: async () => {
      let emailConfigured = false;
      let smsConfigured = false;
      try {
        const emailConfig = await settingsApi.getEmailConfig();
        emailConfigured = !!(emailConfig?.config?.isActive && emailConfig?.config?.apiKey !== null);
      } catch (error) {
        logger.error('Failed to load email config:', error);
      }
      try {
        const smsConfig = await settingsApi.getSMSConfig();
        smsConfigured = !!(smsConfig?.config?.isActive && smsConfig?.config?.accountSid !== null && smsConfig?.config?.authToken !== null);
      } catch (error) {
        logger.error('Failed to load SMS config:', error);
      }
      return { emailConfigured, smsConfigured };
    },
  });

  const emailConfigured = integrationStatus?.emailConfigured ?? false;
  const smsConfigured = integrationStatus?.smsConfigured ?? false;

  const integrations = [
    {
      id: 1,
      name: 'Salesforce',
      category: 'CRM',
      description: 'Sync leads and contacts with Salesforce CRM',
      status: 'coming_soon' as const,
      icon: '🔵',
    },
    {
      id: 2,
      name: 'HubSpot',
      category: 'CRM',
      description: 'Import and export contacts with HubSpot',
      status: 'coming_soon' as const,
      icon: '🟠',
    },
    {
      id: 3,
      name: 'Mailchimp',
      category: 'Email',
      description: 'Send email campaigns through Mailchimp',
      status: 'coming_soon' as const,
      icon: '🐵',
    },
    {
      id: 4,
      name: 'Google Sheets',
      category: 'Data',
      description: 'Export data to Google Sheets',
      status: 'coming_soon' as const,
      icon: '📊',
    },
    {
      id: 5,
      name: 'Slack',
      category: 'Communication',
      description: 'Get notifications in Slack channels',
      status: 'coming_soon' as const,
      icon: '💬',
    },
    {
      id: 6,
      name: 'Zapier',
      category: 'Automation',
      description: 'Connect to 3000+ apps via Zapier',
      status: 'coming_soon' as const,
      icon: '⚡',
    },
    {
      id: 7,
      name: 'Stripe',
      category: 'Payment',
      description: 'Accept payments and manage subscriptions',
      status: 'coming_soon' as const,
      icon: '💳',
    },
    {
      id: 8,
      name: 'Zillow',
      category: 'Real Estate',
      description: 'Import listings and leads from Zillow',
      status: 'coming_soon' as const,
      icon: '🏠',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your favorite tools and services
          </p>
        </div>
        <Button>Browse All Integrations</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configured</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(emailConfigured ? 1 : 0) + (smsConfigured ? 1 : 0)}</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">Planned integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Setup Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(!emailConfigured ? 1 : 0) + (!smsConfigured ? 1 : 0)}</div>
            <p className="text-xs text-muted-foreground">Need configuration</p>
          </CardContent>
        </Card>
      </div>

      {/* Required Integrations — real API status */}
      {(!emailConfigured || !smsConfigured) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Required Integrations
            </CardTitle>
            <CardDescription>These integrations are required for core functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/settings/email">
                <div className={`p-4 border rounded-lg hover:bg-accent transition-colors flex items-center justify-between ${emailConfigured ? 'border-success/50' : 'border-warning/50'}`}>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-info" />
                    <div>
                      <p className="font-medium">Email (SendGrid)</p>
                      <p className="text-xs text-muted-foreground">Email sending & templates</p>
                    </div>
                  </div>
                  <Badge variant={emailConfigured ? 'success' : 'secondary'}>
                    {emailConfigured ? 'Active' : 'Setup Required'}
                  </Badge>
                </div>
              </Link>
              <Link to="/settings/twilio">
                <div className={`p-4 border rounded-lg hover:bg-accent transition-colors flex items-center justify-between ${smsConfigured ? 'border-success/50' : 'border-warning/50'}`}>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Twilio (SMS & Calls)</p>
                      <p className="text-xs text-muted-foreground">SMS campaigns & calls</p>
                    </div>
                  </div>
                  <Badge variant={smsConfigured ? 'success' : 'secondary'}>
                    {smsConfigured ? 'Active' : 'Setup Required'}
                  </Badge>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Configure your connected integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link to="/settings/email">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">Email Configuration</p>
                    <p className="text-xs text-muted-foreground">SendGrid API keys & templates</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link to="/settings/google">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-medium">Google Integration</p>
                    <p className="text-xs text-muted-foreground">Calendar, Contacts & Gmail</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link to="/settings/twilio">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Twilio Setup</p>
                    <p className="text-xs text-muted-foreground">SMS & calling configuration</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

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
                <Badge variant="secondary">
                  Coming Soon
                </Badge>
              </div>
              <CardDescription className="mt-2">{integration.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
};

export default IntegrationsHub;
