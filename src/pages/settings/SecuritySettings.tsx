import { Lock, Shield, Key, Smartphone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const SecuritySettings = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account security and authentication</p>
      </div>

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle>Security Score</CardTitle>
          <CardDescription>Your account security strength</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-bold">85/100</div>
                <p className="text-sm text-muted-foreground">Strong</p>
              </div>
            </div>
            <Badge variant="success">Good</Badge>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 mb-4">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">✓ Two-factor authentication enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">✓ Strong password</span>
            </div>
            <div className="flex items-center justify-between text-warning">
              <span>⚠ Last password change: 6 months ago</span>
              <Button variant="link" size="sm">Change Now</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password regularly for better security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Current Password</label>
            <Input type="password" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Password</label>
            <Input type="password" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
            <Input type="password" />
          </div>
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">Password requirements:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase and lowercase letters</li>
              <li>• Contains at least one number</li>
              <li>• Contains at least one special character</li>
            </ul>
          </div>
          <Button>Update Password</Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
            <Smartphone className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium mb-1">Authenticator App</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Using Google Authenticator ending in ••••789
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Reconfigure</Button>
                <Button variant="ghost" size="sm">Remove</Button>
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-4 p-4 border rounded-lg">
            <Key className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium mb-1">Backup Codes</h4>
              <p className="text-sm text-muted-foreground mb-3">
                5 backup codes available for emergency access
              </p>
              <Button variant="outline" size="sm">View Codes</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">Windows • Chrome</h4>
                    <Badge variant="success" className="text-xs">Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">San Francisco, CA • Active now</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">iPhone • Safari</h4>
                  <p className="text-sm text-muted-foreground">San Francisco, CA • 2 hours ago</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Revoke</Button>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4">
            Sign Out All Other Sessions
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
