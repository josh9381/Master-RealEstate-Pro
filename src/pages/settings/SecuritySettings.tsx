import { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const SecuritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [lastPasswordChange, setLastPasswordChange] = useState('');
  
  // Sessions state
  const [sessions] = useState([
    { id: 1, device: 'Windows • Chrome', location: 'San Francisco, CA', time: 'Active now', current: true },
    { id: 2, device: 'iPhone • Safari', location: 'San Francisco, CA', time: '2 hours ago', current: false },
    { id: 3, device: 'macOS • Firefox', location: 'San Jose, CA', time: '1 day ago', current: false },
  ]);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const settings = await settingsApi.getSecuritySettings();
      
      if (settings) {
        const data = settings.data || settings;
        setTwoFactorEnabled(data.twoFactorEnabled ?? true);
        setSecurityScore(data.securityScore ?? 0);
        setLastPasswordChange(data.lastPasswordChange || '');
      }
      
      if (isRefresh) {
        toast.success('Security settings refreshed');
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load security settings, using defaults');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadSecuritySettings(true);
  };
  
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setSaving(true);
    try {
      await settingsApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggle2FA = async () => {
    setSaving(true);
    try {
      if (twoFactorEnabled) {
        await settingsApi.disable2FA({});
        setTwoFactorEnabled(false);
        toast.success('2FA disabled');
      } else {
        await settingsApi.enable2FA({});
        setTwoFactorEnabled(true);
        toast.success('2FA enabled successfully');
      }
      loadSecuritySettings(); // Reload from API
    } catch (error) {
      console.error('Failed to toggle 2FA:', error);
      toast.error('Failed to update 2FA settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleRemove2FA = async () => {
    if (!confirm('Are you sure you want to remove 2FA? This will make your account less secure.')) {
      return;
    }
    toast.info('2FA removal is not yet implemented');
  };
  
  const handleReconfigure2FA = () => {
    toast.info('Opening 2FA reconfiguration wizard...');
    // In a real app, this would open a modal with QR code
  };
  
  const handleViewBackupCodes = () => {
    setShowBackupCodes(!showBackupCodes);
  };
  
  const handleRevokeSession = async (_sessionId: number) => {
    toast.info('Session revocation is not yet implemented');
  };
  
  const handleSignOutAllSessions = async () => {
    if (!confirm('Are you sure you want to sign out all other sessions?')) {
      return;
    }
    toast.info('Sign out all sessions is not yet implemented');
  };
  
  const handleDeleteAccount = async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }
    toast.info('Account deletion is not yet implemented');
  };
  
  return (
    <div className="space-y-6 max-w-4xl">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading security settings...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account security and authentication</p>
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
                <div className="text-3xl font-bold">{securityScore || '—'}/100</div>
                <p className="text-sm text-muted-foreground">
                  {securityScore >= 80 ? 'Strong' : securityScore >= 50 ? 'Moderate' : securityScore > 0 ? 'Weak' : '—'}
                </p>
              </div>
            </div>
            <Badge variant={securityScore >= 80 ? 'success' : securityScore >= 50 ? 'default' : 'destructive'}>
              {securityScore >= 80 ? 'Good' : securityScore >= 50 ? 'Fair' : securityScore > 0 ? 'Needs Improvement' : '—'}
            </Badge>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 mb-4">
            <div className={`h-2 rounded-full ${securityScore >= 80 ? 'bg-green-600' : securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${securityScore}%` }}></div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">✓ Two-factor authentication enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">✓ Strong password</span>
            </div>
            <div className="flex items-center justify-between text-warning">
              <span>⚠ Last password change: {lastPasswordChange ? new Date(lastPasswordChange).toLocaleDateString() : 'Unknown'}</span>
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
            <Input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Password</label>
            <Input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
            <Input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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
          <Button onClick={handlePasswordChange} disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </Button>
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
            <Badge variant={twoFactorEnabled ? "success" : "secondary"}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorEnabled ? (
            <>
              <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                <Smartphone className="h-5 w-5 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Authenticator App</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Using Google Authenticator ending in ••••789
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleReconfigure2FA}>Reconfigure</Button>
                    <Button variant="ghost" size="sm" onClick={handleRemove2FA}>Remove</Button>
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
                  <Button variant="outline" size="sm" onClick={handleViewBackupCodes}>
                    {showBackupCodes ? 'Hide Codes' : 'View Codes'}
                  </Button>
                  {showBackupCodes && (
                    <div className="mt-3 p-3 bg-muted rounded-md font-mono text-sm space-y-1">
                      <div>XXXX-XXXX-XXXX-0001</div>
                      <div>XXXX-XXXX-XXXX-0002</div>
                      <div>XXXX-XXXX-XXXX-0003</div>
                      <div>XXXX-XXXX-XXXX-0004</div>
                      <div>XXXX-XXXX-XXXX-0005</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-2">Two-Factor Authentication Not Enabled</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Protect your account with an additional layer of security
              </p>
              <Button onClick={handleToggle2FA}>Enable 2FA</Button>
            </div>
          )}
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
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 ${session.current ? 'bg-green-100' : 'bg-secondary'} rounded-lg`}>
                    {session.device.includes('iPhone') || session.device.includes('iOS') ? (
                      <Smartphone className={`h-5 w-5 ${session.current ? 'text-green-600' : ''}`} />
                    ) : (
                      <Shield className={`h-5 w-5 ${session.current ? 'text-green-600' : ''}`} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{session.device}</h4>
                      {session.current && (
                        <Badge variant="success" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{session.location} • {session.time}</p>
                  </div>
                </div>
                {!session.current && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={handleSignOutAllSessions}
          >
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
            <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default SecuritySettings;
