import { Settings, User, Building2, Shield, Bell, CreditCard, Tag, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Link } from 'react-router-dom';

const SettingsHub = () => {
  const settingsCategories = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and preferences',
      icon: User,
      path: '/settings/profile',
      items: ['Name & Email', 'Avatar', 'Timezone', 'Language'],
    },
    {
      id: 'business',
      title: 'Business Settings',
      description: 'Configure your company information',
      icon: Building2,
      path: '/settings/business',
      items: ['Company Info', 'Address', 'Tax ID', 'Logo'],
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Manage security settings and authentication',
      icon: Shield,
      path: '/settings/security',
      items: ['Password', 'Two-Factor Auth', 'Sessions', 'API Keys'],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Control email and in-app notifications',
      icon: Bell,
      path: '/settings/notifications',
      items: ['Email Alerts', 'Push Notifications', 'Digest', 'Frequency'],
    },
    {
      id: 'billing',
      title: 'Billing & Subscription',
      description: 'Manage your subscription and payment methods',
      icon: CreditCard,
      path: '/billing',
      items: ['Plan', 'Payment Methods', 'Invoices', 'Usage'],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect external apps and services',
      icon: Settings,
      path: '/integrations',
      items: ['CRM', 'Email Provider', 'Analytics', 'Webhooks'],
    },
    {
      id: 'tags',
      title: 'Tags Manager',
      description: 'Organize leads with custom tags and categories',
      icon: Tag,
      path: '/settings/tags',
      items: ['Tag Library', 'Colors', 'Categories', 'Usage Stats'],
    },
    {
      id: 'custom-fields',
      title: 'Custom Fields',
      description: 'Create custom fields for lead data collection',
      icon: List,
      path: '/settings/custom-fields',
      items: ['Field Types', 'Validation', 'Options', 'Requirements'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.id} to={category.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.items.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Commonly used settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/settings/security/password">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Shield className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium">Change Password</p>
              </div>
            </Link>
            <Link to="/settings/security/2fa">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Shield className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium">Enable 2FA</p>
              </div>
            </Link>
            <Link to="/integrations/api">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Settings className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium">API Keys</p>
              </div>
            </Link>
            <Link to="/billing/subscription">
              <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <CreditCard className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium">Upgrade Plan</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsHub;
