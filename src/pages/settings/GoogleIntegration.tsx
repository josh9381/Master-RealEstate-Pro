import { Chrome, Calendar, Mail, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const GoogleIntegration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Workspace Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect Google services for enhanced functionality
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Account Connection</CardTitle>
              <CardDescription>Your connected Google Workspace account</CardDescription>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                <Chrome className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">admin@yourcompany.com</p>
                <p className="text-sm text-muted-foreground">
                  Connected on January 15, 2024
                </p>
              </div>
            </div>
            <Button variant="outline">Disconnect</Button>
          </div>
        </CardContent>
      </Card>

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
              <Badge variant="success">Active</Badge>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" defaultChecked className="sr-only peer" />
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
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Sync all emails automatically</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track email opens and clicks</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
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
              <Badge variant="success">Active</Badge>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" defaultChecked className="sr-only peer" />
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
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Sync CRM tasks to Calendar</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Add attendees from lead contacts</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
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
              <Badge variant="secondary">Inactive</Badge>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" />
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
              <input type="checkbox" className="rounded" />
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
    </div>
  );
};

export default GoogleIntegration;
