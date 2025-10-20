import { Phone, MessageSquare, Settings, Power } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const TwilioSetup = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Twilio Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure Twilio for SMS and phone call functionality
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current Twilio API connection</CardDescription>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
              <Power className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Successfully connected to Twilio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Last verified: 2 minutes ago
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
              defaultValue="AC1234567890abcdef1234567890abcd"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Auth Token</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              defaultValue="abcdef1234567890abcdef123456"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div className="flex space-x-2">
            <Button>Save Credentials</Button>
            <Button variant="outline">Test Connection</Button>
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
            <Button>
              <Phone className="h-4 w-4 mr-2" />
              Add Number
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                number: '+1 (555) 123-4567',
                type: 'Toll-Free',
                capabilities: ['SMS', 'Voice'],
                status: 'active',
              },
              {
                number: '+1 (555) 234-5678',
                type: 'Local',
                capabilities: ['SMS', 'Voice', 'MMS'],
                status: 'active',
              },
              {
                number: '+1 (555) 345-6789',
                type: 'Mobile',
                capabilities: ['SMS', 'MMS'],
                status: 'active',
              },
            ].map((phone, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{phone.number}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary">{phone.type}</Badge>
                      {phone.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="success">{phone.status}</Badge>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
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
    </div>
  );
};

export default TwilioSetup;
