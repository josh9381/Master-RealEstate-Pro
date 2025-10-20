import { Mail, Server, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const EmailConfiguration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure SMTP settings and email delivery
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Service Status</CardTitle>
              <CardDescription>Current email delivery status</CardDescription>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">SMTP Connected</p>
                <p className="text-xs text-muted-foreground">Last test: 5 min ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Domain Verified</p>
                <p className="text-xs text-muted-foreground">crm.yourcompany.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">SPF/DKIM Configured</p>
                <p className="text-xs text-muted-foreground">All checks passed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Server className="h-5 w-5 inline mr-2" />
            SMTP Server Settings
          </CardTitle>
          <CardDescription>Configure your email server connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                defaultValue="smtp.sendgrid.net"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Port</label>
              <select className="w-full px-3 py-2 border rounded-lg" defaultValue="587">
                <option value="25">25 (Default)</option>
                <option value="587">587 (TLS)</option>
                <option value="465">465 (SSL)</option>
                <option value="2525">2525 (Alternative)</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <input
                type="text"
                placeholder="your-username"
                defaultValue="apikey"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                defaultValue="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Encryption</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="tls">
              <option value="none">None</option>
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button>Save Settings</Button>
            <Button variant="outline">Send Test Email</Button>
          </div>
        </CardContent>
      </Card>

      {/* Sender Information */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Mail className="h-5 w-5 inline mr-2" />
            Default Sender Information
          </CardTitle>
          <CardDescription>Default "From" details for outgoing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">From Name</label>
              <input
                type="text"
                placeholder="Your Company Name"
                defaultValue="Your CRM Team"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Email</label>
              <input
                type="email"
                placeholder="noreply@yourcompany.com"
                defaultValue="noreply@yourcrm.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Reply-To Email</label>
              <input
                type="email"
                placeholder="support@yourcompany.com"
                defaultValue="support@yourcrm.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">BCC Email</label>
              <input
                type="email"
                placeholder="archive@yourcompany.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Shield className="h-5 w-5 inline mr-2" />
            Domain Authentication
          </CardTitle>
          <CardDescription>SPF, DKIM, and DMARC configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Domain</label>
            <input
              type="text"
              placeholder="yourcompany.com"
              defaultValue="yourcrm.com"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* SPF Record */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">SPF Record</h4>
              <Badge variant="success">Verified</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Add this TXT record to your DNS:
            </p>
            <div className="p-3 bg-muted rounded font-mono text-xs">
              v=spf1 include:sendgrid.net ~all
            </div>
          </div>

          {/* DKIM Record */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">DKIM Record</h4>
              <Badge variant="success">Verified</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Add this TXT record to your DNS:
            </p>
            <div className="p-3 bg-muted rounded font-mono text-xs break-all">
              k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
            </div>
          </div>

          {/* DMARC Record */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">DMARC Record</h4>
              <Badge variant="warning">Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Add this TXT record to your DNS:
            </p>
            <div className="p-3 bg-muted rounded font-mono text-xs">
              v=DMARC1; p=quarantine; rua=mailto:dmarc@yourcrm.com
            </div>
          </div>

          <Button>Verify DNS Records</Button>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template Settings</CardTitle>
          <CardDescription>Configure template defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Include unsubscribe link in all emails</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track email opens</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track link clicks</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Include company logo in header</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Add social media links in footer</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Settings</CardTitle>
          <CardDescription>Control email delivery behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Daily Send Limit</label>
            <input
              type="number"
              placeholder="10000"
              defaultValue="10000"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum emails per day (0 = unlimited)
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Rate Limit</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>No limit</option>
              <option>100 emails per hour</option>
              <option>500 emails per hour</option>
              <option>1000 emails per hour</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Bounce Handling</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>Mark as bounced after 1 failure</option>
              <option>Mark as bounced after 3 failures</option>
              <option>Mark as bounced after 5 failures</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Email Usage This Month</CardTitle>
          <CardDescription>Current month statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-blue-600">23,456</p>
              <p className="text-sm text-muted-foreground mt-1">Sent</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-green-600">98.2%</p>
              <p className="text-sm text-muted-foreground mt-1">Delivered</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-orange-600">32.4%</p>
              <p className="text-sm text-muted-foreground mt-1">Opened</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-red-600">1.8%</p>
              <p className="text-sm text-muted-foreground mt-1">Bounced</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfiguration;
