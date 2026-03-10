import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Key, Smartphone, AlertTriangle, RefreshCw, Monitor, Globe, Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { settingsApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator';

interface Session {
  id: string;
  ipAddress: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

const SecuritySettings = () => {
  const { toast } = useToast();
  const showConfirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [lastPasswordChange, setLastPasswordChange] = useState('');
  
  // 2FA Setup wizard state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [setupQrCode, setSetupQrCode] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  
  // 2FA Disable state
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Fetch security settings
  const { data: securityData, isLoading: loading, isFetching: refreshing, refetch } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: async () => {
      const settings = await settingsApi.getSecuritySettings();
      return settings?.data || settings;
    },
  });

  // Fetch real sessions from API
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const result = await authApi.getSessions();
      return (result?.sessions || result || []) as Session[];
    },
  });

  // Sync fetched data into form state
  useEffect(() => {
    if (securityData) {
      setTwoFactorEnabled(securityData.twoFactorEnabled ?? false);
      setSecurityScore(securityData.securityScore ?? 0);
      setLastPasswordChange(securityData.lastPasswordChange || '');
    }
  }, [securityData]);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
  };
  
  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await settingsApi.changePassword(data);
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings', 'security'] });
    },
    onError: () => {
      toast.error('Failed to update password');
    },
  });

  const handlePasswordChange = () => {
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
    passwordMutation.mutate({ currentPassword, newPassword });
  };
  
  // 2FA Setup flow
  const handleStart2FASetup = async () => {
    setSetupLoading(true);
    try {
      const result = await settingsApi.enable2FA({});
      const data = result?.data || result;
      setSetupQrCode(data.qrCode || '');
      setSetupSecret(data.secret || '');
      setShow2FASetup(true);
    } catch (error) {
      logger.error('Failed to start 2FA setup:', error)
      toast.error('Failed to start 2FA setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }
    setSetupLoading(true);
    try {
      await settingsApi.verify2FA({ token: verifyCode, secret: setupSecret });
      toast.success('2FA enabled successfully!');
      setShow2FASetup(false);
      setVerifyCode('');
      setSetupQrCode('');
      setSetupSecret('');
      setTwoFactorEnabled(true);
      queryClient.invalidateQueries({ queryKey: ['settings', 'security'] });
    } catch (error) {
      logger.error('Failed to verify 2FA code:', error)
      toast.error('Invalid code. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  // 2FA Disable flow
  const handleDisable2FA = async () => {
    if (!disablePassword || !disableCode) {
      toast.error('Password and 2FA code are required');
      return;
    }
    try {
      await settingsApi.disable2FA({ password: disablePassword, token: disableCode });
      toast.success('2FA has been disabled');
      setShowDisable2FA(false);
      setDisablePassword('');
      setDisableCode('');
      setTwoFactorEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['settings', 'security'] });
    } catch (error) {
      logger.error('Failed to disable 2FA:', error)
      toast.error('Invalid password or 2FA code');
    }
  };

  // Session revocation
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.terminateSession(sessionId),
    onSuccess: () => {
      toast.success('Session revoked');
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: () => toast.error('Failed to revoke session'),
  });

  const terminateAllMutation = useMutation({
    mutationFn: () => authApi.terminateAllSessions(),
    onSuccess: () => {
      toast.success('All other sessions have been terminated');
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: () => toast.error('Failed to terminate sessions'),
  });

  const handleSignOutAllSessions = async () => {
    if (!await showConfirm({ title: 'Sign Out Sessions', message: 'Are you sure you want to sign out all other sessions?', confirmLabel: 'Sign Out All', variant: 'destructive' })) return;
    terminateAllMutation.mutate();
  };

  // Account deletion
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => authApi.deleteAccount(password),
    onSuccess: () => {
      toast.success('Account deleted');
      clearAuth();
      navigate('/auth/login');
    },
    onError: () => toast.error('Failed to delete account. Check your password.'),
  });

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }
    deleteAccountMutation.mutate(deletePassword);
  };

  const formatSessionTime = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Active now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const sessions = sessionsData || [];
  
  return (
    <div className="space-y-6 max-w-4xl">
      {loading ? (
        <LoadingSkeleton rows={3} />
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
              <span className={twoFactorEnabled ? 'text-green-600' : 'text-muted-foreground'}>
                {twoFactorEnabled ? '✓' : '✕'} Two-factor authentication {twoFactorEnabled ? 'enabled' : 'not enabled'}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>✓ Strong password</span>
            </div>
            <div className="flex items-center justify-between text-warning">
              <span>⚠ Last password change: {lastPasswordChange ? new Date(lastPasswordChange).toLocaleDateString() : 'Unknown'}</span>
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
            <div className="mt-2">
              <PasswordStrengthIndicator password={newPassword} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
            <Input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={passwordMutation.isPending || !isPasswordStrong(newPassword)}>
            {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
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
          {/* 2FA Setup Wizard */}
          {show2FASetup && (
            <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-4">
              <h4 className="font-medium text-lg">Set Up Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {setupQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={setupQrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                <code className="text-sm font-mono select-all break-all">{setupSecret}</code>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter verification code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-widest font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleVerify2FASetup} disabled={setupLoading || verifyCode.length < 6}>
                  {setupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Enable
                </Button>
                <Button variant="outline" onClick={() => { setShow2FASetup(false); setVerifyCode(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* 2FA Disable Confirmation */}
          {showDisable2FA && (
            <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20 space-y-4">
              <h4 className="font-medium text-red-600">Disable Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Enter your password and a 2FA code to disable two-factor authentication.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">2FA Code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-widest font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDisable2FA}>
                  Disable 2FA
                </Button>
                <Button variant="outline" onClick={() => { setShowDisable2FA(false); setDisablePassword(''); setDisableCode(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* 2FA Status */}
          {!show2FASetup && !showDisable2FA && (
            twoFactorEnabled ? (
              <>
                <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                  <Smartphone className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Authenticator App</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your account is protected with two-factor authentication
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => { setShow2FASetup(false); handleStart2FASetup(); }}>
                        Reconfigure
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowDisable2FA(true)}>
                        Remove 2FA
                      </Button>
                    </div>
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
                <Button onClick={handleStart2FASetup} disabled={setupLoading}>
                  {setupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Enable 2FA
                </Button>
              </div>
            )
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
          {sessionsLoading ? (
            <LoadingSkeleton rows={3} />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active sessions found</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: Session, idx: number) => {
                const isFirst = idx === 0; // Most recent = likely current session
                const deviceLabel = [session.os, session.browser].filter(Boolean).join(' • ') || session.deviceType || 'Unknown device';
                const locationLabel = [session.city, session.country].filter(Boolean).join(', ') || 'Unknown location';
                
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 ${isFirst ? 'bg-green-100' : 'bg-secondary'} rounded-lg`}>
                        {session.deviceType === 'Mobile' ? (
                          <Smartphone className={`h-5 w-5 ${isFirst ? 'text-green-600' : ''}`} />
                        ) : session.deviceType === 'Tablet' ? (
                          <Globe className={`h-5 w-5 ${isFirst ? 'text-green-600' : ''}`} />
                        ) : (
                          <Monitor className={`h-5 w-5 ${isFirst ? 'text-green-600' : ''}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm">{deviceLabel}</h4>
                          {isFirst && (
                            <Badge variant="success" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {locationLabel} • {formatSessionTime(session.lastActiveAt || session.createdAt)}
                          {session.ipAddress && <span className="ml-1">• {session.ipAddress}</span>}
                        </p>
                      </div>
                    </div>
                    {!isFirst && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {sessions.length > 1 && (
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={handleSignOutAllSessions}
              disabled={terminateAllMutation.isPending}
            >
              {terminateAllMutation.isPending ? 'Terminating...' : 'Sign Out All Other Sessions'}
            </Button>
          )}
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
          {showDeleteConfirm ? (
            <div className="p-4 border border-red-200 rounded-lg space-y-4">
              <h4 className="font-medium text-red-600">Confirm Account Deletion</h4>
              <p className="text-sm text-muted-foreground">
                This action is permanent and cannot be undone. All your data will be deleted.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter your password to confirm</label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your current password"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending || !deletePassword}
                >
                  {deleteAccountMutation.isPending ? 'Deleting...' : 'Permanently Delete Account'}
                </Button>
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default SecuritySettings;
