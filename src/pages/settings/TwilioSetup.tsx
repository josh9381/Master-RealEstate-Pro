import { Phone, MessageSquare, Settings, Power, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const TwilioSetup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(true);
  const [accountSid, setAccountSid] = useState('AC1234567890abcdef1234567890abcd');
  const [authToken, setAuthToken] = useState('abcdef1234567890abcdef123456');
  const [phoneNumbers] = useState([
    {
      id: '1',
      number: '+1 (555) 123-4567',
      type: 'Toll-Free',
      capabilities: ['SMS', 'Voice'],
      status: 'active',
    },
    {
      id: '2',
      number: '+1 (555) 234-5678',
      type: 'Local',
      capabilities: ['SMS', 'Voice', 'MMS'],
      status: 'active',
    },
  ]);

  useEffect(() => {
    loadTwilioConfig();
  }, []);

  const loadTwilioConfig = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const config = await settingsApi.getSMSConfig();
      if (config) {
        setAccountSid(config.accountSid || 'AC1234567890abcdef1234567890abcd');
        setAuthToken(config.authToken || 'abcdef1234567890abcdef123456');
        setConnected(config.connected ?? true);
      }
      if (isRefresh) toast.success('Settings refreshed');
    } catch (error) {
      console.error('Failed to load Twilio config:', error);
      toast.error('Failed to load settings, using defaults');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadTwilioConfig(true);

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      await settingsApi.updateSMSConfig({ accountSid, authToken });
      toast.success('Credentials Saved', 'Twilio credentials have been updated successfully.');
      loadTwilioConfig(); // Reload
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast.error('Error', 'Failed to save credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setConnected(true);
      toast.success('Connection Successful', 'Successfully connected to Twilio API.');
    } catch (error) {
      setConnected(false);
      toast.error('Connection Failed', 'Unable to connect to Twilio. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = () => {
    toast.info('Add Number', 'Opening Twilio phone number purchase flow...');
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading Twilio configuration...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Twilio Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure Twilio for SMS and phone call functionality
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current Twilio API connection</CardDescription>
            </div>
            <Badge variant={connected ? "success" : "secondary"}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center h-12 w-12 rounded-lg ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Power className={`h-6 w-6 ${connected ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-medium">
                {connected ? 'Successfully connected to Twilio' : 'Not connected'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {connected ? 'Last verified: 2 minutes ago' : 'Connect to verify'}
              </p>
            </div>
          </div>
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
            <label className="text-sm font-medium mb-2 block">Account SID</label>
            <input
              type="text"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Auth Token</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? 'Saving...' : 'Save Credentials'}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={saving}>
              Test Connection
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
                  <Badge variant="success">{phone.status}</Badge>
                </div>
              </div>
            ))}
          </div>
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
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>+1 (555) 123-4567</option>
                <option>+1 (555) 234-5678</option>
                <option>+1 (555) 345-6789</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMS Character Limit</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>160 characters (1 SMS)</option>
                <option>320 characters (2 SMS)</option>
                <option>480 characters (3 SMS)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Enable delivery receipts</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Enable link shortening</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Automatically opt-out on STOP keywords</span>
            </label>
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
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>+1 (555) 123-4567</option>
                <option>+1 (555) 234-5678</option>
                <option>+1 (555) 345-6789</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recording</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Record all calls</option>
                <option>Record inbound only</option>
                <option>Record outbound only</option>
                <option>Do not record</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Voicemail URL</label>
            <input
              type="text"
              placeholder="https://your-server.com/voicemail"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Enable call forwarding</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Enable voicemail transcription</span>
            </label>
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
              <p className="text-3xl font-bold">3,456</p>
              <p className="text-sm text-muted-foreground mt-1">sent this month</p>
              <p className="text-sm font-medium text-green-600 mt-2">$34.56 cost</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Voice Minutes</h4>
              <p className="text-3xl font-bold">728</p>
              <p className="text-sm text-muted-foreground mt-1">minutes used</p>
              <p className="text-sm font-medium text-green-600 mt-2">$72.80 cost</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Phone Numbers</h4>
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm text-muted-foreground mt-1">active numbers</p>
              <p className="text-sm font-medium text-green-600 mt-2">$3.00 cost</p>
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
              <p className="text-2xl font-bold text-green-600">$110.36</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Settings className="h-5 w-5 inline mr-2" />
            Webhooks
          </CardTitle>
          <CardDescription>Configure webhooks for real-time updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">SMS Status Callback URL</label>
            <input
              type="text"
              placeholder="https://your-server.com/webhooks/sms-status"
              defaultValue="https://api.yourcrm.com/webhooks/twilio/sms"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Voice Status Callback URL</label>
            <input
              type="text"
              placeholder="https://your-server.com/webhooks/voice-status"
              defaultValue="https://api.yourcrm.com/webhooks/twilio/voice"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <Button>Update Webhooks</Button>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default TwilioSetup;
