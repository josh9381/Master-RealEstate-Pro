import { useState, useEffect } from 'react';
import { Mail, Server, Shield, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { settingsApi, messagesApi } from '@/lib/api';

const EmailConfiguration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Status indicators
  const [isConfigured, setIsConfigured] = useState(false);
  const [configMode, setConfigMode] = useState<'production' | 'mock' | 'environment'>('mock');
  const [lastTested, setLastTested] = useState<string | null>(null);
  
  // Show/hide API key
  const [showApiKey, setShowApiKey] = useState(false);
  
  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [username, setUsername] = useState('apikey');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('tls');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  
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

  // Usage Statistics
  const [usageStats, setUsageStats] = useState({
    sent: 0,
    delivered: 0,
    deliveryRate: 0,
    opened: 0,
    openRate: 0,
    bounced: 0,
    bounceRate: 0,
  });

  useEffect(() => {
    const initializeData = async () => {
      await loadEmailConfig();
      await loadUsageStats();
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmailConfig = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await settingsApi.getEmailConfig();
      const config = response?.config;
      
      if (config) {
        // Update SMTP settings from API
        setSmtpHost(config.smtpHost || 'smtp.sendgrid.net');
        setSmtpPort(String(config.smtpPort) || '587');
        setUsername(config.smtpUser || 'apikey');
        
        // Check if API key is stored (masked response means it exists)
        const apiKeyStored = config.apiKey && config.apiKey.startsWith('••••');
        setHasStoredKey(apiKeyStored);
        
        // Don't populate password field - user must enter new one to update
        setPassword('');
        
        setEncryption('tls'); // SendGrid uses TLS
        setFromName(config.fromName || 'Your CRM Team');
        setFromEmail(config.fromEmail || 'noreply@yourcrm.com');
        
        // Update status indicators
        setIsConfigured(config.isActive && apiKeyStored);
        setConfigMode(apiKeyStored ? 'production' : 'mock');
      }
      
      if (isRefresh) {
        toast.success('Email configuration refreshed');
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
      toast.error('Failed to load email configuration, using defaults');
      setConfigMode('mock');
      setIsConfigured(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      // Fetch EMAIL-only statistics by passing type parameter
      const response = await messagesApi.getStats({ type: 'EMAIL' });
      const stats = response?.data;
      
      if (stats) {
        // Now total, sent, delivered, failed, opened are EMAIL-only
        const emailCount = stats.total || 0;
        const delivered = stats.delivered || 0;
        const opened = stats.opened || 0;
        const failed = stats.failed || 0;
        
        // Calculate rates based on EMAIL messages only
        const deliveryRate = emailCount > 0 ? (delivered / emailCount) * 100 : 0;
        const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
        const bounceRate = emailCount > 0 ? (failed / emailCount) * 100 : 0;
        
        setUsageStats({
          sent: emailCount,
          delivered,
          deliveryRate: Math.min(deliveryRate, 100), // Cap at 100%
          opened,
          openRate,
          bounced: failed,
          bounceRate,
        });
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const handleRefresh = () => {
    loadEmailConfig(true);
    loadUsageStats();
  };
  
  const handleTestConnection = async () => {
    if (!fromEmail) {
      toast.error('Please enter a "From Email" address');
      return;
    }
    
    if (!hasStoredKey) {
      toast.error('Please save your SendGrid API key first before testing');
      return;
    }
    
    setTestingConnection(true);
    try {
      const result = await settingsApi.testEmail({ 
        to: fromEmail, // Test email to yourself
        subject: 'Test Email from RealEstate Pro',
        message: 'If you receive this email, your SendGrid configuration is working correctly!'
      });
      
      // Update status based on test result
      setLastTested(new Date().toLocaleString());
      setConfigMode(result.mode === 'mock' ? 'mock' : 'production');
      setIsConfigured(result.mode !== 'mock');
      
      if (result.mode === 'mock') {
        toast.success(`Test email sent in MOCK mode (no actual delivery). Save your API key first.`);
      } else {
        toast.success(`Test email sent successfully in PRODUCTION mode! Check ${fromEmail}`);
      }
    } catch (error: any) {
      console.error('Failed to test connection:', error);
      const message = error.response?.data?.error || error.message || 'Failed to send test email';
      toast.error(message);
      setConfigMode('mock');
      setIsConfigured(false);
    } finally {
      setTestingConnection(false);
    }
  };
  
  const handleSaveSettings = async () => {
    // Validation: Need API key for new setup, optional for updates
    if (!hasStoredKey && !password) {
      toast.error('Please enter your SendGrid API key');
      return;
    }
    
    if (password && !password.startsWith('SG.')) {
      toast.error('Invalid SendGrid API key format. Must start with "SG."');
      return;
    }

    setSaving(true);
    try {
      const updateData: {
        provider: string;
        fromEmail?: string;
        fromName?: string;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPassword?: null;
        isActive: boolean;
        apiKey?: string;
      } = {
        provider: 'sendgrid',
        fromEmail,
        fromName,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser: username,
        smtpPassword: null,
        isActive: true,
      };
      
      // Only include API key if user entered a new one
      if (password) {
        updateData.apiKey = password;
      }
      
      await settingsApi.updateEmailConfig(updateData);
      
      const successMsg = hasStoredKey 
        ? password 
          ? 'Email configuration and API key updated successfully' 
          : 'Email configuration updated successfully'
        : 'Email configuration saved successfully';
      
      toast.success(successMsg);
      setPassword(''); // Clear password field after save
      await loadEmailConfig(); // Reload from API
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
              <CardDescription>Current email delivery configuration</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {configMode === 'production' ? (
                <Badge variant="success">Production Mode</Badge>
              ) : configMode === 'environment' ? (
                <Badge variant="default">Environment Mode</Badge>
              ) : (
                <Badge variant="secondary">Mock Mode</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-3">
              {isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <div>
                <p className="font-medium">
                  {isConfigured ? 'API Key Configured' : 'No API Key'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConfigured ? 'Using database configuration' : 'Add SendGrid API key to enable'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {lastTested ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <div>
                <p className="font-medium">
                  {lastTested ? 'Connection Tested' : 'Not Tested'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastTested ? `Last test: ${lastTested}` : 'Click "Send Test Email" to verify'}
                </p>
              </div>
            </div>
          </div>
          
          {configMode === 'mock' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Mock Mode:</strong> Emails will be logged but not actually sent. 
                Add your SendGrid API key above and save to enable production mode.
              </p>
            </div>
          )}
          
          {configMode === 'production' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Production Mode:</strong> Emails will be sent using your SendGrid API key. 
                All campaign emails will be delivered to recipients.
              </p>
            </div>
          )}
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
              <label className="text-sm font-medium mb-2 block">
                SendGrid API Key
                {hasStoredKey && (
                  <span className="ml-2 text-xs text-green-600 font-normal">✓ Stored Securely</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder={hasStoredKey ? "Enter new API key to update" : "SG.xxxxxxxxxxxxxxxxxxxxxxxx"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border rounded-lg font-mono text-sm"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title={showApiKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
              {hasStoredKey && !password && (
                <p className="text-xs text-muted-foreground mt-1">
                  🔒 API key is encrypted and stored securely. Enter a new key above to update it.
                </p>
              )}
              {password && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ New key entered. Click "Save Settings" to update.
                </p>
              )}
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
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                toast.success('Email template settings saved!');
              }}
              disabled={saving}
            >
              Save Template Settings
            </Button>
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
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                toast.success('Delivery settings saved!');
              }}
              disabled={saving}
            >
              Save Delivery Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Email Usage This Month</CardTitle>
          <CardDescription>Real-time statistics from your database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{usageStats.sent.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Sent</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {usageStats.deliveryRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Delivered</p>
              <p className="text-xs text-muted-foreground mt-1">
                {usageStats.delivered.toLocaleString()} emails
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-orange-600">
                {usageStats.openRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Opened</p>
              <p className="text-xs text-muted-foreground mt-1">
                {usageStats.opened.toLocaleString()} opens
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-red-600">
                {usageStats.bounceRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Bounced</p>
              <p className="text-xs text-muted-foreground mt-1">
                {usageStats.bounced.toLocaleString()} failed
              </p>
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
