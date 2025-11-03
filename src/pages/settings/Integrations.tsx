import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Plug, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';
import { settingsApi } from '@/lib/api';

const Integrations = () => {
  const [loading, setLoading] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    setLoading(true);
    try {
      // Check email configuration
      const emailConfig = await settingsApi.getEmailConfig();
      setEmailConfigured(
        emailConfig?.config?.isActive && 
        emailConfig?.config?.apiKey !== null
      );

      // Check SMS configuration
      const smsConfig = await settingsApi.getSMSConfig();
      setSmsConfigured(
        smsConfig?.config?.isActive && 
        smsConfig?.config?.accountSid !== null &&
        smsConfig?.config?.authToken !== null
      );
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const integrations = [
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Send professional emails to your leads and contacts',
      icon: Mail,
      category: 'Email',
      configured: emailConfigured,
      path: '/settings/email',
      features: [
        'Unlimited email sending',
        'Template management',
        'Delivery tracking',
        'Open & click analytics',
      ],
      setup: {
        difficulty: 'Easy',
        time: '5 minutes',
        required: true,
      },
      status: emailConfigured ? 'Active' : 'Not configured',
      color: 'bg-blue-500',
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'Send SMS messages and make calls to leads',
      icon: MessageSquare,
      category: 'SMS',
      configured: smsConfigured,
      path: '/settings/twilio',
      features: [
        'SMS campaigns',
        'Two-way messaging',
        'Delivery tracking',
        'International support',
      ],
      setup: {
        difficulty: 'Easy',
        time: '10 minutes',
        required: true,
      },
      status: smsConfigured ? 'Active' : 'Not configured',
      color: 'bg-red-500',
    },
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Sync calendar, contacts, and Gmail',
      icon: Mail,
      category: 'Productivity',
      configured: false,
      path: '/settings/integrations/google',
      features: [
        'Calendar sync',
        'Contact import',
        'Gmail integration',
        'Drive storage',
      ],
      setup: {
        difficulty: 'Medium',
        time: '15 minutes',
        required: false,
      },
      status: 'Coming soon',
      color: 'bg-yellow-500',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect with 5,000+ apps and automate workflows',
      icon: Plug,
      category: 'Automation',
      configured: false,
      path: '/settings/integrations/zapier',
      features: [
        'Automated workflows',
        'Custom triggers',
        'Multi-step zaps',
        '5,000+ app connections',
      ],
      setup: {
        difficulty: 'Medium',
        time: '20 minutes',
        required: false,
      },
      status: 'Coming soon',
      color: 'bg-orange-500',
    },
  ];

  const categories = ['All', 'Email', 'SMS', 'Productivity', 'Automation'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredIntegrations =
    selectedCategory === 'All'
      ? integrations
      : integrations.filter((i) => i.category === selectedCategory);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect external services to enhance your CRM capabilities
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading integrations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect external services to enhance your CRM capabilities
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter((i) => i.configured).length}
            </div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">Total integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter((i) => i.setup.required && !i.configured).length}
            </div>
            <p className="text-xs text-muted-foreground">Needs setup</p>
          </CardContent>
        </Card>
      </div>

      {/* Required Setup Banner */}
      {integrations.some((i) => i.setup.required && !i.configured) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <CardTitle className="text-orange-900">Required Integrations</CardTitle>
                <CardDescription className="text-orange-700 mt-1">
                  To send campaigns, you need to configure these integrations:
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrations
                .filter((i) => i.setup.required && !i.configured)
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <integration.icon className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {integration.setup.time} setup time
                        </p>
                      </div>
                    </div>
                    <Link to={integration.path}>
                      <Button size="sm" variant="default">
                        Configure Now
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex space-x-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredIntegrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card
              key={integration.id}
              className={`hover:shadow-lg transition-shadow ${
                integration.configured ? 'border-green-200' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-3 ${integration.color} rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{integration.name}</span>
                        {integration.configured && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={integration.configured ? 'success' : 'secondary'}
                  >
                    {integration.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Features */}
                <div>
                  <p className="text-sm font-medium mb-2">Features:</p>
                  <ul className="space-y-1">
                    {integration.features.map((feature, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-center"
                      >
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Setup Info */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Setup: </span>
                    {integration.setup.difficulty} • {integration.setup.time}
                  </div>
                  {integration.status !== 'Coming soon' && (
                    <Link to={integration.path}>
                      <Button
                        size="sm"
                        variant={integration.configured ? 'outline' : 'default'}
                      >
                        {integration.configured ? 'Manage' : 'Setup'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help with Integrations?</CardTitle>
          <CardDescription>
            Get started with our comprehensive setup guides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/docs/integrations/sendgrid"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <Mail className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium mb-1">SendGrid Setup Guide</p>
              <p className="text-xs text-muted-foreground">
                Learn how to configure email delivery
              </p>
            </a>
            <a
              href="/docs/integrations/twilio"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <MessageSquare className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium mb-1">Twilio Setup Guide</p>
              <p className="text-xs text-muted-foreground">
                Configure SMS messaging for your CRM
              </p>
            </a>
            <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
              <Plug className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium mb-1">API Documentation</p>
              <p className="text-xs text-muted-foreground">
                Build custom integrations with our API
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
