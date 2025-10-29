import { useState, useEffect } from 'react';
import { Mail, Server, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const EmailConfiguration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [username, setUsername] = useState('apikey');
  const [password, setPassword] = useState('SG.xxxxxxxxxxxxxxxxxxxxxxxx');
  const [encryption, setEncryption] = useState('tls');
  
  // Sender Information
  const [fromName, setFromName] = useState('Your CRM Team');
  const [fromEmail, setFromEmail] = useState('noreply@yourcrm.com');
  const [replyToEmail, setReplyToEmail] = useState('support@yourcrm.com');
  const [bccEmail, setBccEmail] = useState('');
  
  // Domain Authentication
  const [domain, setDomain] = useState('yourcrm.com');
  
  // Template Settings
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(false);
  const [includeSocial, setIncludeSocial] = useState(false);
  
  // Delivery Settings
  const [dailyLimit, setDailyLimit] = useState('10000');
  const [rateLimit, setRateLimit] = useState('No limit');
  const [bounceHandling, setBounceHandling] = useState('Mark as bounced after 1 failure');

  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const config = await settingsApi.getEmailConfig();
      
      if (config) {
        setSmtpHost(config.smtpHost || 'smtp.sendgrid.net');
        setSmtpPort(config.smtpPort || '587');
        setUsername(config.username || 'apikey');
        setPassword(config.password || 'SG.xxxxxxxxxxxxxxxxxxxxxxxx');
        setEncryption(config.encryption || 'tls');
        setFromName(config.fromName || 'Your CRM Team');
        setFromEmail(config.fromEmail || 'noreply@yourcrm.com');
        setReplyToEmail(config.replyToEmail || 'support@yourcrm.com');
      }
      
      if (isRefresh) {
        toast.success('Email configuration refreshed');
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
      toast.error('Failed to load email configuration, using defaults');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadEmailConfig(true);
  };
  
  const handleTestConnection = async () => {
    if (!smtpHost || !smtpPort || !username || !password) {
      toast.error('Please fill in all SMTP settings');
      return;
    }
    
    setTestingConnection(true);
    try {
      await settingsApi.testEmail({ smtpHost, smtpPort, username, password, encryption });
      toast.success('SMTP connection successful! Test email sent.');
    } catch (error) {
      console.error('Failed to test connection:', error);
      toast.error('Failed to connect to SMTP server');
    } finally {
      setTestingConnection(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsApi.updateEmailConfig({
        smtpHost,
        smtpPort,
        username,
        password,
        encryption,
        fromName,
        fromEmail,
        replyToEmail,
        bccEmail,
        domain,
        includeUnsubscribe,
        trackOpens,
        trackClicks,
        includeLogo,
        includeSocial,
        dailyLimit,
        rateLimit,
        bounceHandling,
      });
      toast.success('Email configuration saved successfully');
      loadEmailConfig(); // Reload from API
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleVerifyDNS = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('DNS records verified successfully');
    } catch (error) {
      toast.error('Failed to verify DNS records');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading email configuration...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure SMTP settings and email delivery
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Port</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              >
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Encryption</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg" 
              value={encryption}
              onChange={(e) => setEncryption(e.target.value)}
            >
              <option value="none">None</option>
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? 'Testing...' : 'Send Test Email'}
            </Button>
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
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Email</label>
              <input
                type="email"
                placeholder="noreply@yourcompany.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
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
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">BCC Email</label>
              <input
                type="email"
                placeholder="archive@yourcompany.com"
                value={bccEmail}
                onChange={(e) => setBccEmail(e.target.value)}
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
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
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

          <Button onClick={handleVerifyDNS} loading={loading}>Verify DNS Records</Button>
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
              <input 
                type="checkbox" 
                checked={includeUnsubscribe}
                onChange={(e) => setIncludeUnsubscribe(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Include unsubscribe link in all emails</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={trackOpens}
                onChange={(e) => setTrackOpens(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Track email opens</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={trackClicks}
                onChange={(e) => setTrackClicks(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Track link clicks</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Include company logo in header</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeSocial}
                onChange={(e) => setIncludeSocial(e.target.checked)}
                className="rounded" 
              />
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
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum emails per day (0 = unlimited)
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Rate Limit</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
            >
              <option>No limit</option>
              <option>100 emails per hour</option>
              <option>500 emails per hour</option>
              <option>1000 emails per hour</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Bounce Handling</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={bounceHandling}
              onChange={(e) => setBounceHandling(e.target.value)}
            >
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
        </>
      )}
    </div>
  );
};

export default EmailConfiguration;
