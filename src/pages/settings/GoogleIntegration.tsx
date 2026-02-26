import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Chrome, Calendar, Mail, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const GoogleIntegration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(true);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [connectedDate, setConnectedDate] = useState('');
  
  // Gmail settings
  const [gmailEnabled, setGmailEnabled] = useState(true);
  const [syncEmails, setSyncEmails] = useState(true);
  const [trackEmails, setTrackEmails] = useState(true);
  const [createLeads, setCreateLeads] = useState(false);
  
  // Calendar settings
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [autoCreateEvents, setAutoCreateEvents] = useState(false);
  
  // Contacts settings
  const [contactsEnabled, setContactsEnabled] = useState(true);
  const [syncContacts, setSyncContacts] = useState(true);
  const [autoImport, setAutoImport] = useState(false);

  const { data: integrationData, isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['settings', 'integration', 'google'],
    queryFn: async () => {
      const status = await settingsApi.getIntegrationStatus('google');
      return status;
    },
  });

  useEffect(() => {
    if (integrationData) {
      setConnected(integrationData.connected ?? true);
      setConnectedEmail(integrationData.email || integrationData.account?.email || '');
      setConnectedDate(integrationData.connectedAt || integrationData.connectedDate || '');
    }
  }, [integrationData]);

  const handleRefresh = () => refetch();
  
  const handleConnect = async () => {
    setSaving(true);
    try {
      await settingsApi.connectIntegration('google', {});
      setConnected(true);
      toast.success('Connected to Google Workspace successfully');
      queryClient.invalidateQueries({ queryKey: ['settings', 'integration', 'google'] });
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to connect to Google');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Workspace?')) return;
    
    setSaving(true);
    try {
      await settingsApi.disconnectIntegration('google');
      setConnected(false);
      toast.success('Disconnected from Google Workspace');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsApi.updateIntegrationSettings('google', {
        gmail: { enabled: gmailEnabled, syncEmails, trackEmails, createLeads },
        calendar: { enabled: calendarEnabled, syncCalendar, autoCreateEvents },
        contacts: { enabled: contactsEnabled, syncContacts, autoImport },
      });
      toast.success('Google integration settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings', 'integration', 'google'] });
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading Google integration...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Workspace Integration</h1>
          <p className="text-muted-foreground mt-2">
            Connect Google services for enhanced functionality
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
              <CardTitle>Google Account Connection</CardTitle>
              <CardDescription>Your connected Google Workspace account</CardDescription>
            </div>
            <Badge variant={connected ? "success" : "secondary"}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                  <Chrome className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{connectedEmail || 'Google Account'}</p>
                  <p className="text-sm text-muted-foreground">
                    {connectedDate ? `Connected on ${new Date(connectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Connected'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleDisconnect} disabled={saving}>
                {saving ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Connect your Google Workspace account to enable integrations
              </p>
              <Button onClick={handleConnect} disabled={saving}>
                <Chrome className="h-4 w-4 mr-2" />
                {saving ? 'Connecting...' : 'Connect Google Account'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          {/* Gmail Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <Mail className="h-5 w-5 inline mr-2" />
                    Gmail Integration
                  </CardTitle>
                  <CardDescription>Send and receive emails through Gmail</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={gmailEnabled ? "success" : "secondary"}>
                    {gmailEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                  <label className="relative inline-block w-12 h-6">
                    <input 
                      type="checkbox" 
                      checked={gmailEnabled}
                      onChange={(e) => setGmailEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold">Sync Emails</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync emails with CRM contacts
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold">Send from CRM</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Send emails directly from the CRM interface
              </p>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={syncEmails}
                onChange={(e) => setSyncEmails(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Sync all emails automatically</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={trackEmails}
                onChange={(e) => setTrackEmails(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Track email opens and clicks</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={createLeads}
                onChange={(e) => setCreateLeads(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Create leads from new email contacts</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <Calendar className="h-5 w-5 inline mr-2" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>Sync meetings and tasks with Google Calendar</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={calendarEnabled ? "success" : "secondary"}>
                {calendarEnabled ? 'Active' : 'Inactive'}
              </Badge>
              <label className="relative inline-block w-12 h-6">
                <input 
                  type="checkbox" 
                  checked={calendarEnabled}
                  onChange={(e) => setCalendarEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold">Two-Way Sync</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Changes sync automatically in both directions
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold">Event Creation</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Create calendar events from CRM tasks
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Default Calendar</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>Primary Calendar</option>
              <option>CRM Events</option>
              <option>Sales Meetings</option>
            </select>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={syncCalendar}
                onChange={(e) => setSyncCalendar(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Sync CRM tasks to Calendar</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoCreateEvents}
                onChange={(e) => setAutoCreateEvents(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Add attendees from lead contacts</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoImport}
                onChange={(e) => setAutoImport(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Send calendar invites automatically</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Google Contacts Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Contacts Integration</CardTitle>
              <CardDescription>Sync contacts between CRM and Google</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={contactsEnabled ? "success" : "secondary"}>
                {contactsEnabled ? 'Active' : 'Inactive'}
              </Badge>
              <label className="relative inline-block w-12 h-6">
                <input 
                  type="checkbox" 
                  checked={contactsEnabled}
                  onChange={(e) => setContactsEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              Enable this integration to sync your CRM contacts with Google Contacts.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Sync Direction</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>CRM to Google only</option>
              <option>Google to CRM only</option>
              <option>Two-way sync</option>
            </select>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={syncContacts}
                onChange={(e) => setSyncContacts(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">Sync contact photos</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Include company information</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Google Drive Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Drive Integration</CardTitle>
              <CardDescription>Store and manage files in Google Drive</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="warning">Coming Soon</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              This integration is currently under development. You'll be able to save CRM
              files directly to Google Drive and access Drive files from within the CRM.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Shield className="h-5 w-5 inline mr-2" />
            API Configuration
          </CardTitle>
          <CardDescription>Google API credentials and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Client ID</label>
            <input
              type="text"
              placeholder="xxxxx.apps.googleusercontent.com"
              defaultValue="123456789-abc123def456.apps.googleusercontent.com"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Client Secret</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••"
              defaultValue="GOCSPX-abcdefghijklmnopqrst"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Authorized Scopes</label>
            <div className="space-y-2">
              {[
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/contacts.readonly',
              ].map((scope, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-xs font-mono">{scope}</span>
                  <Badge variant="success">Authorized</Badge>
                </div>
              ))}
            </div>
          </div>
          <Button>Update API Settings</Button>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Google API usage this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">2,345</p>
              <p className="text-sm text-muted-foreground mt-1">Gmail API Calls</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">1,567</p>
              <p className="text-sm text-muted-foreground mt-1">Calendar API Calls</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600">890</p>
              <p className="text-sm text-muted-foreground mt-1">Contacts API Calls</p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
      
      {/* Save Button */}
      {connected && (
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Integration Settings'}
          </Button>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default GoogleIntegration;
