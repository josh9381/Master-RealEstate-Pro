import { useState, useEffect, useCallback } from 'react';
import { Users, Shield, Activity, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { adminApi } from '@/lib/api';

const SystemSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  
  // General Settings
  const [systemName, setSystemName] = useState('Your CRM System');
  const [systemUrl, setSystemUrl] = useState('https://crm.yourcompany.com');
  const [systemDescription, setSystemDescription] = useState('Customer Relationship Management System for sales and marketing teams');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12');
  
  // Security Settings
  const [strongPasswords, setStrongPasswords] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [require2FAAdmins, setRequire2FAAdmins] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(30);

  // Load settings from API on mount
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSystemSettings();
      const data = response.data || response;
      
      if (data.general) {
        setSystemName(data.general.systemName || 'Your CRM System');
        setSystemUrl(data.general.systemUrl || 'https://crm.yourcompany.com');
        setSystemDescription(data.general.systemDescription || '');
        setLanguage(data.general.language || 'en');
        setTimezone(data.general.timezone || 'America/New_York');
        setDateFormat(data.general.dateFormat || 'MM/DD/YYYY');
        setTimeFormat(data.general.timeFormat || '12');
      }

      if (data.security) {
        setStrongPasswords(data.security.strongPasswords ?? true);
        setEnable2FA(data.security.enable2FA ?? true);
        setRequire2FAAdmins(data.security.require2FAAdmins ?? true);
        setSessionTimeout(data.security.sessionTimeout ?? 60);
        setMaxLoginAttempts(data.security.maxLoginAttempts ?? 5);
        setLockoutDuration(data.security.lockoutDuration ?? 30);
      }
    } catch (error: any) {
      // If 404 or no endpoint, use defaults silently
      if (error?.response?.status !== 404) {
        console.error('Failed to load system settings:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  const handleSaveGeneralSettings = async () => {
    if (!systemName || !systemUrl) {
      toast.error('System name and URL are required');
      return;
    }
    
    setSavingGeneral(true);
    try {
      await adminApi.updateSystemSettings({
        section: 'general',
        data: {
          systemName,
          systemUrl,
          systemDescription,
          language,
          timezone,
          dateFormat,
          timeFormat,
        },
      });
      toast.success('General settings saved successfully');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save general settings';
      toast.error(message);
    } finally {
      setSavingGeneral(false);
    }
  };
  
  const handleSaveSecuritySettings = async () => {
    if (sessionTimeout < 1 || maxLoginAttempts < 1 || lockoutDuration < 1) {
      toast.error('Please enter valid positive numbers for all fields');
      return;
    }

    setSavingSecurity(true);
    try {
      await adminApi.updateSystemSettings({
        section: 'security',
        data: {
          strongPasswords,
          enable2FA,
          require2FAAdmins,
          sessionTimeout,
          maxLoginAttempts,
          lockoutDuration,
        },
      });
      toast.success('Security settings saved successfully');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save security settings';
      toast.error(message);
    } finally {
      setSavingSecurity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure system-wide preferences and options
        </p>
      </div>

      {/* System Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Version</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v2.4.1</div>
            <p className="text-xs text-muted-foreground">Latest</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58</div>
            <p className="text-xs text-muted-foreground">Online now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="success">Secure</Badge>
          </CardContent>
        </Card>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">System Name</label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">System URL</label>
              <input
                type="text"
                value={systemUrl}
                onChange={(e) => setSystemUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">System Description</label>
            <textarea
              rows={3}
              value={systemDescription}
              onChange={(e) => setSystemDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Default Language</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Default Timezone</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Format</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Time Format</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg" 
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
              >
                <option value="12">12-hour (AM/PM)</option>
                <option value="24">24-hour</option>
              </select>
            </div>
          </div>
          <Button onClick={handleSaveGeneralSettings} disabled={savingGeneral}>
            {savingGeneral && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save General Settings
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure system security options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={strongPasswords}
                onChange={(e) => setStrongPasswords(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Require strong passwords</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Passwords must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={enable2FA}
                onChange={(e) => setEnable2FA(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Enable two-factor authentication</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={require2FAAdmins}
                onChange={(e) => setRequire2FAAdmins(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Require 2FA for admins</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Session Timeout (minutes)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Login Attempts</label>
            <input
              type="number"
              value={maxLoginAttempts}
              onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Lockout Duration (minutes)</label>
            <input
              type="number"
              value={lockoutDuration}
              onChange={(e) => setLockoutDuration(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <Button onClick={handleSaveSecuritySettings} disabled={savingSecurity}>
            {savingSecurity && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>System Email Notifications</CardTitle>
          <CardDescription>Configure automatic system notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Send daily activity summary</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Send security alerts</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Send backup completion notifications</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Send system maintenance notifications</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Admin Email Addresses</label>
            <textarea
              rows={3}
              placeholder="admin1@company.com, admin2@company.com"
              defaultValue="admin@yourcompany.com"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
          <CardDescription>Optimize system performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable caching</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cache Duration (minutes)</label>
            <input
              type="number"
              defaultValue="60"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable compression</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Upload File Size (MB)</label>
            <input
              type="number"
              defaultValue="10"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Database Backup Schedule</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="daily">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>Enable maintenance mode for system updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              When maintenance mode is enabled, only administrators will be able to access
              the system. Regular users will see a maintenance message.
            </p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm font-medium">Enable Maintenance Mode</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Maintenance Message</label>
            <textarea
              rows={3}
              placeholder="We're currently performing system maintenance..."
              defaultValue="We're currently performing system maintenance. We'll be back soon!"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>Configure API access and rate limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable API access</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">API Rate Limit (requests/hour)</label>
            <input
              type="number"
              defaultValue="1000"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">API Version</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="v2">
              <option value="v1">v1 (Legacy)</option>
              <option value="v2">v2 (Current)</option>
              <option value="v3">v3 (Beta)</option>
            </select>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Require API key for all requests</span>
            </label>
          </div>
          <Button>Save API Settings</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions - use with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Reset System to Factory Defaults</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This will erase all data and restore system to initial state
              </p>
            </div>
            <Button variant="destructive">Reset System</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Delete All User Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete all leads, contacts, and user data
              </p>
            </div>
            <Button variant="destructive">Delete Data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;
