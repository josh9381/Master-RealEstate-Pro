import { Phone, MessageSquare, Power, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { settingsApi, messagesApi } from '@/lib/api';

const TwilioSetup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState<string>('');
  
  // Show/hide sensitive fields
  const [showAccountSid, setShowAccountSid] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  
  // Status indicators
  const [_isConfigured, setIsConfigured] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [configMode, setConfigMode] = useState<'production' | 'mock' | 'environment'>('mock');
  const [lastTested, setLastTested] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Usage statistics
  const [usageStats, setUsageStats] = useState<{
    smsCount: number;
    emailCount: number;
    callCount: number;
    totalCost: number;
  }>({
    smsCount: 0,
    emailCount: 0,
    callCount: 0,
    totalCost: 0,
  });
  
  // Phone numbers from config
  const [phoneNumbers, setPhoneNumbers] = useState<Array<{
    id: string;
    number: string;
    type: string;
    capabilities: string[];
    status: string;
  }>>([]);

  // SMS Settings state
  const [smsCharLimit, setSmsCharLimit] = useState<number>(160);
  const [enableDeliveryReceipts, setEnableDeliveryReceipts] = useState(true);
  const [enableLinkShortening, setEnableLinkShortening] = useState(true);
  const [autoOptOut, setAutoOptOut] = useState(false);

  // Voice Settings state
  const [recordingMode, setRecordingMode] = useState('record-all');
  const [voicemailUrl, setVoicemailUrl] = useState('');
  const [enableCallForwarding, setEnableCallForwarding] = useState(true);
  const [enableVoicemailTranscription, setEnableVoicemailTranscription] = useState(true);

  // Load current user profile
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await settingsApi.getProfile();
        const user = response?.data?.user || response?.data || response;
        if (user?.id) {
          setUserId(user.id);
        } else {
          const token = localStorage.getItem('accessToken');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              if (payload.userId) setUserId(payload.userId);
            } catch (e) { console.error('Failed to decode JWT:', e); }
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  const { data: twilioConfigData, isLoading: loading, isFetching, refetch: refetchConfig } = useQuery({
    queryKey: ['settings', 'twilio', 'config'],
    queryFn: async () => {
      const response = await settingsApi.getSMSConfig();
      return response?.config || response;
    },
  });

  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['settings', 'twilio', 'usage'],
    queryFn: async () => {
      const response = await messagesApi.getStats();
      return response?.data;
    },
  });

  // Sync Twilio config to form state
  useEffect(() => {
    if (!twilioConfigData) return;
    const config = twilioConfigData;
    if (config.accountSid) {
      setAccountSid(config.accountSid);
    } else {
      setAccountSid('');
    }
    setAuthToken('');
    if (config.updatedAt) setLastUpdated(config.updatedAt);
    setPhoneNumber(config.phoneNumber || '');
    if (config.phoneNumber) {
      setPhoneNumbers([{
        id: '1',
        number: config.phoneNumber,
        type: 'Configured',
        capabilities: ['SMS', 'Voice'],
        status: config.isActive ? 'active' : 'inactive',
      }]);
    } else {
      setPhoneNumbers([]);
    }
    const credentialsExist = config.hasCredentials || false;
    setHasCredentials(credentialsExist);
    setConnected(!!config.isActive && credentialsExist);
    setIsConfigured(config.isActive && credentialsExist);
    setConfigMode(credentialsExist ? 'production' : 'mock');
  }, [twilioConfigData]);

  // Sync usage stats to state
  useEffect(() => {
    if (!usageData) return;
    const stats = usageData;
    const smsCount = stats.byType?.find((t: { type: string; count: number }) => t.type === 'SMS')?.count || 0;
    const emailCount = stats.byType?.find((t: { type: string; count: number }) => t.type === 'EMAIL')?.count || 0;
    const callCount = stats.byType?.find((t: { type: string; count: number }) => t.type === 'CALL')?.count || 0;
    const smsCost = smsCount * 0.01;
    const callCost = callCount * 0.1;
    const numberCost = 3.00;
    const totalCost = smsCost + callCost + numberCost;
    setUsageStats({ smsCount, emailCount, callCount, totalCost });
  }, [usageData]);

  const handleRefresh = () => {
    refetchConfig();
    refetchUsage();
  };

  const handleSaveCredentials = async () => {
    // Determine if this is a new save or update
    const isNewCredentials = !hasCredentials;
    const isUpdatingCredentials = accountSid && authToken; // User provided new credentials
    const isUpdatingPhoneOnly = hasCredentials && !authToken; // Just updating phone number
    
    // Validation for new credentials
    if (isNewCredentials) {
      if (!accountSid || !authToken || !phoneNumber) {
        toast.error('Please fill in Account SID, Auth Token, and Phone Number');
        return;
      }
      if (!accountSid.startsWith('AC')) {
        toast.error('Invalid Account SID. Must start with "AC"');
        return;
      }
      if (authToken.length !== 32) {
        toast.error('Invalid Auth Token. Must be 32 characters');
        return;
      }
    }
    
    // Validation when updating credentials
    if (isUpdatingCredentials && accountSid && !accountSid.startsWith('AC')) {
      toast.error('Invalid Account SID. Must start with "AC"');
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string | boolean> = {
        provider: 'twilio',
        isActive: true
      };
      
      // Add fields that are being updated
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }
      
      // Only send credentials if user entered them (new or update)
      if (accountSid) {
        updateData.accountSid = accountSid;
      }
      if (authToken) {
        updateData.authToken = authToken;
      }
      
      await settingsApi.updateSMSConfig(updateData);
      
      const successMsg = isNewCredentials 
        ? 'Twilio credentials saved successfully!' 
        : isUpdatingPhoneOnly 
        ? 'Phone number updated successfully' 
        : 'Credentials updated successfully';
      
      toast.success(successMsg);
      setConnected(true);
      await queryClient.invalidateQueries({ queryKey: ['settings', 'twilio', 'config'] });
    } catch (error: unknown) {
      console.error('Failed to save credentials:', error);
      const err = error as { response?: { data?: { error?: string } } }
      const errorMsg = err?.response?.data?.error || 'Failed to save credentials';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number to send test SMS');
      return;
    }

    setTestingConnection(true);
    try {
      const result = await settingsApi.testSMS({ 
        to: phoneNumber, // Test SMS to your Twilio number (won't work but will test API)
        message: 'Test SMS from RealEstate Pro. If you receive this, your Twilio configuration is working!'
      });
      
      // Update status based on test result
      setLastTested(new Date().toLocaleString());
      setConfigMode(result.mode === 'mock' ? 'mock' : 'production');
      setIsConfigured(result.mode !== 'mock');
      setConnected(result.mode !== 'mock');
      
      if (result.mode === 'mock') {
        toast.success('Test SMS sent in MOCK mode (no actual delivery). Save your credentials first.');
      } else {
        toast.success(`Test SMS sent successfully in PRODUCTION mode!`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      const message = (error as {response?: {data?: {error?: string}}, message?: string})?.response?.data?.error || (error as Error)?.message || 'Failed to send test SMS';
      toast.error(message);
      setConnected(false);
      setConfigMode('mock');
      setIsConfigured(false);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDeleteCredentials = async () => {
    if (!confirm('Are you sure you want to delete your stored Twilio credentials? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      await settingsApi.deleteSMSConfig();
      toast.success('Credentials deleted successfully');
      
      // Clear local state
      setAccountSid('');
      setAuthToken('');
      setPhoneNumber('');
      setHasCredentials(false);
      setConnected(false);
      setIsConfigured(false);
      setConfigMode('mock');
      setPhoneNumbers([]);
      
      queryClient.invalidateQueries({ queryKey: ['settings', 'twilio', 'config'] });
    } catch (error: unknown) {
      console.error('Failed to delete credentials:', error);
      const err = error as { response?: { data?: { error?: string } } }
      const errorMsg = err?.response?.data?.error || 'Failed to delete credentials';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNumber = () => {
    toast.info('Add Number', 'Opening Twilio phone number purchase flow...');
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Twilio Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure Twilio for SMS and phone call functionality
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching && !loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SMS Service Status</CardTitle>
              <CardDescription>Current SMS delivery configuration</CardDescription>
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
              <div className={`flex items-center justify-center h-12 w-12 rounded-lg ${connected ? 'bg-green-100' : hasCredentials ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Power className={`h-6 w-6 ${connected ? 'text-green-600' : hasCredentials ? 'text-yellow-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">
                  {connected ? 'Active & Connected' : hasCredentials ? 'Credentials Stored' : 'Not Configured'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {connected 
                    ? 'Ready to send SMS' 
                    : hasCredentials 
                    ? 'Enable in settings to activate' 
                    : 'Add Twilio credentials to enable'}
                </p>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated: {new Date(lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {lastTested ? (
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {lastTested ? 'Connection Verified' : hasCredentials ? 'Needs Testing' : 'Not Tested'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastTested ? `Last test: ${lastTested}` : hasCredentials ? 'Test connection below' : 'Configure credentials first'}
                </p>
              </div>
            </div>
          </div>
          
          {configMode === 'mock' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Mock Mode:</strong> SMS messages will be logged but not actually sent. 
                Add your Twilio credentials above and save to enable production mode.
              </p>
            </div>
          )}
          
          {configMode === 'production' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Production Mode:</strong> SMS messages will be sent using your Twilio credentials. 
                All campaign messages will be delivered to recipients.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>Your Twilio account credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Account SID
              {accountSid && accountSid.startsWith('AC') && (
                <span className="ml-2 text-xs text-green-600 font-normal">✓ Stored</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showAccountSid ? "text" : "password"}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                className="w-full px-3 py-2 pr-20 border rounded-lg font-mono text-sm"
              />
              {accountSid && accountSid.startsWith('AC') && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountSid('');
                    setShowAccountSid(false);
                  }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 px-2 py-1 hover:bg-gray-100 rounded text-xs text-blue-600 border"
                  title="Clear to enter new Account SID"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAccountSid(!showAccountSid)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title={showAccountSid ? "Hide Account SID" : "Show Account SID"}
              >
                {showAccountSid ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            {accountSid && accountSid.startsWith('AC') && (
              <p className="text-xs text-muted-foreground mt-1">
                Account SID stored. Click eye icon to show/hide, or "Clear" to change it.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Auth Token
              {hasCredentials && (
                <span className="ml-2 text-xs text-green-600 font-normal">✓ Stored Securely</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showAuthToken ? "text" : "password"}
                placeholder={hasCredentials ? "Enter new Auth Token to update" : "Enter your Twilio Auth Token"}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-3 py-2 pr-10 border rounded-lg font-mono text-sm"
              />
              {authToken && (
                <button
                  type="button"
                  onClick={() => setShowAuthToken(!showAuthToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  title={showAuthToken ? "Hide Auth Token" : "Show Auth Token"}
                >
                  {showAuthToken ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              )}
            </div>
            {hasCredentials && !authToken && (
              <p className="text-xs text-muted-foreground mt-1">
                🔒 Auth Token is encrypted and stored securely. It cannot be retrieved for security reasons. Enter a new token above to update it.
              </p>
            )}
            {authToken && (
              <p className="text-xs text-green-600 mt-1">
                ✓ New token entered. Click "Save Credentials" to update.
              </p>
            )}
            {!hasCredentials && !authToken && (
              <p className="text-xs text-muted-foreground mt-1">
                Your Auth Token will be encrypted and stored securely.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <input
              type="text"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your Twilio phone number in E.164 format (e.g., +15551234567)
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? 'Saving...' : 'Save Credentials'}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? 'Testing...' : 'Send Test SMS'}
            </Button>
            {hasCredentials && (
              <Button variant="destructive" onClick={handleDeleteCredentials} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete Credentials'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>📡 Webhook Configuration</CardTitle>
          <CardDescription>Configure Twilio to send incoming messages to your CRM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">🎯 Your Webhook URL</p>
            <p className="text-xs text-blue-700 mb-3">
              Copy this URL and paste it in your Twilio Phone Number settings
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={userId ? `${window.location.protocol}//${window.location.hostname.replace('3000', '8000')}/api/webhooks/twilio/sms/${userId}` : 'Loading webhook URL...'}
                className="flex-1 px-3 py-2 bg-white border rounded-lg font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!userId) {
                    toast.error('User ID not loaded yet. Please refresh the page.');
                    return;
                  }
                  const webhookUrl = `${window.location.protocol}//${window.location.hostname.replace('3000', '8000')}/api/webhooks/twilio/sms/${userId}`;
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success('Webhook URL copied to clipboard!');
                }}
                disabled={!userId}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">📋 Setup Instructions:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank" rel="noopener noreferrer" className="text-primary underline">Twilio Phone Numbers</a></li>
                <li>Click on your phone number: <strong>{phoneNumber || 'your number'}</strong></li>
                <li>Scroll to "Messaging Configuration"</li>
                <li>Under "A MESSAGE COMES IN":
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>• Select "Webhook"</li>
                    <li>• Paste your webhook URL (copied above)</li>
                    <li>• Set method to "HTTP POST"</li>
                  </ul>
                </li>
                <li>Click "Save Configuration"</li>
              </ol>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-medium text-yellow-900 mb-1">⚠️ Important:</p>
              <p className="text-xs text-yellow-700">
                Make sure port 8000 is set to <strong>PUBLIC</strong> in your VS Code Ports tab, otherwise Twilio won't be able to reach your webhook.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Status Callback URL (Optional)</p>
                <p className="text-xs text-muted-foreground mt-1">For delivery status updates</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.protocol}//${window.location.hostname.replace('3000', '8000')}/api/webhooks/twilio/status`
                  );
                  toast.success('Status callback URL copied!');
                }}
              >
                Copy URL
              </Button>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="default"
              onClick={() => window.open('https://console.twilio.com/us1/develop/phone-numbers/manage/incoming', '_blank')}
            >
              Open Twilio Console
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Test webhook by sending a test message
                toast.info('Send an SMS to your Twilio number to test the webhook!');
              }}
            >
              How to Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phone Numbers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Twilio Phone Numbers</CardTitle>
              <CardDescription>Phone numbers registered with your account</CardDescription>
            </div>
            <Button onClick={handleAddNumber}>
              <Phone className="h-4 w-4 mr-2" />
              Add Number
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {phoneNumbers.length > 0 ? (
            <div className="space-y-3">
              {phoneNumbers.map((phone) => (
                <div key={phone.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{phone.number}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline">{phone.type}</Badge>
                        {phone.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary">{cap}</Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={phone.status === 'active' ? 'success' : 'secondary'}>{phone.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No phone numbers configured</p>
              <p className="text-sm mt-1">Add your Twilio phone number in the credentials section above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <MessageSquare className="h-5 w-5 inline mr-2" />
            SMS Settings
          </CardTitle>
          <CardDescription>Configure SMS messaging options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Default Sender Number</label>
              <input
                type="text"
                value={phoneNumber || 'Not configured'}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-muted-foreground mt-1">Configure in API Credentials section above</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMS Character Limit</label>
              <select 
                value={smsCharLimit}
                onChange={(e) => setSmsCharLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={160}>160 characters (1 SMS)</option>
                <option value={320}>320 characters (2 SMS)</option>
                <option value={480}>480 characters (3 SMS)</option>
                <option value={1600}>1600 characters (10 SMS)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableDeliveryReceipts}
                onChange={(e) => setEnableDeliveryReceipts(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Enable delivery receipts</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6 mt-1">Receive notifications when messages are delivered</p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableLinkShortening}
                onChange={(e) => setEnableLinkShortening(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Enable link shortening</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6 mt-1">Automatically shorten URLs in messages</p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoOptOut}
                onChange={(e) => setAutoOptOut(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Automatically opt-out on STOP keywords</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6 mt-1">Automatically unsubscribe contacts who reply with STOP, UNSUBSCRIBE, etc.</p>
          </div>
          <div className="pt-4 border-t">
            <Button 
              onClick={async () => {
                setSaving(true);
                try {
                  await settingsApi.updateSMSConfig({
                    smsCharLimit,
                    enableDeliveryReceipts,
                    enableLinkShortening,
                    autoOptOut,
                  });
                  toast.success('SMS settings saved successfully!');
                } catch (error) {
                  toast.error('Failed to save SMS settings. Please try again.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save SMS Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Phone className="h-5 w-5 inline mr-2" />
            Voice Call Settings
          </CardTitle>
          <CardDescription>Configure voice call options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Default Caller ID</label>
              <input
                type="text"
                value={phoneNumber || 'Not configured'}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-muted-foreground mt-1">Configure in API Credentials section above</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recording</label>
              <select 
                value={recordingMode}
                onChange={(e) => setRecordingMode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="record-all">Record all calls</option>
                <option value="record-inbound">Record inbound only</option>
                <option value="record-outbound">Record outbound only</option>
                <option value="do-not-record">Do not record</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Voicemail URL (Optional)</label>
            <input
              type="text"
              placeholder="https://your-server.com/voicemail"
              value={voicemailUrl}
              onChange={(e) => setVoicemailUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">TwiML URL for handling voicemail</p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableCallForwarding}
                onChange={(e) => setEnableCallForwarding(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Enable call forwarding</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6 mt-1">Forward calls to another number when unavailable</p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enableVoicemailTranscription}
                onChange={(e) => setEnableVoicemailTranscription(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Enable voicemail transcription</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6 mt-1">Automatically transcribe voicemail messages to text</p>
          </div>
          <div className="pt-4 border-t">
            <Button 
              onClick={async () => {
                setSaving(true);
                try {
                  await settingsApi.updateSMSConfig({
                    voiceSettings: {
                      recordingMode,
                      voicemailUrl,
                      enableCallForwarding,
                      enableVoicemailTranscription,
                    },
                  });
                  toast.success('Voice settings saved successfully!');
                } catch (error) {
                  toast.error('Failed to save voice settings. Please try again.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Voice Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Usage & Billing</CardTitle>
          <CardDescription>Current month usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">SMS Messages</h4>
              <p className="text-3xl font-bold">{usageStats.smsCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">sent this month</p>
              <p className="text-sm font-medium text-green-600 mt-2">
                ${(usageStats.smsCount * 0.01).toFixed(2)} cost
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Voice Minutes</h4>
              <p className="text-3xl font-bold">{usageStats.callCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">minutes used</p>
              <p className="text-sm font-medium text-green-600 mt-2">
                ${(usageStats.callCount * 0.10).toFixed(2)} cost
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Phone Numbers</h4>
              <p className="text-3xl font-bold">{phoneNumbers.length}</p>
              <p className="text-sm text-muted-foreground mt-1">active numbers</p>
              <p className="text-sm font-medium text-green-600 mt-2">
                ${(phoneNumbers.length * 1.00).toFixed(2)} cost
              </p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Estimated Total This Month</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on current usage
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">${usageStats.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default TwilioSetup;
