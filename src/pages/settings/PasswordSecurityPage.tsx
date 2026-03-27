import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lock, Key, Shield, Smartphone, Monitor, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import { settingsApi, authApi } from '@/lib/api'

interface Session {
  id: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export default function PasswordSecurityPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: securityData } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: async () => {
      const result = await settingsApi.getSecuritySettings();
      return result?.data || result;
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const result = await authApi.getSessions();
      return (result?.sessions || result || []) as Session[];
    },
  });

  const sessions = sessionsData || [];

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
    return `${Math.floor(diffHr / 24)} days ago`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true)
    
    try {
      await settingsApi.changePassword({ currentPassword, newPassword })
      
      // Reset form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      toast.success('Password updated successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } }
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to update password';
      toast.error(message);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Password & Security</h1>
        <p className="text-muted-foreground">Manage your password and security settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Change Password Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters with letters, numbers, and symbols
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>

            <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
              <div>
                <div className="font-medium">Authenticator App</div>
                <div className="text-sm text-muted-foreground">Use an app like Google Authenticator or Authy</div>
              </div>
              <Button variant="outline" onClick={() => navigate('/settings/security')}>
                {securityData?.twoFactorEnabled ? 'Manage' : 'Enable'}
              </Button>
            </div>
          </Card>

          {/* Active Sessions */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Active Sessions</h2>
            </div>

            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                sessions.map((session, idx) => {
                  const isFirst = idx === 0;
                  const deviceLabel = [session.os, session.browser].filter(Boolean).join(' - ') || session.deviceType || 'Unknown device';
                  const locationLabel = [session.city, session.country].filter(Boolean).join(', ') || 'Unknown location';
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {session.deviceType === 'Mobile' ? (
                          <Smartphone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        ) : session.deviceType === 'Tablet' ? (
                          <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {deviceLabel}
                            {isFirst && <Badge variant="success" className="text-xs">Current</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {locationLabel} • {formatSessionTime(session.lastActiveAt || session.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {sessions.length > 1 && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/settings/security')}>
                  Manage All Sessions
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Security Tips Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Security Tips</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <Key className="h-4 w-4 text-primary mt-0.5" />
                <span>Use a unique password you don't use elsewhere</span>
              </li>
              <li className="flex gap-2">
                <Lock className="h-4 w-4 text-primary mt-0.5" />
                <span>Make it at least 12 characters long</span>
              </li>
              <li className="flex gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5" />
                <span>Include numbers, symbols, and mixed case</span>
              </li>
              <li className="flex gap-2">
                <Smartphone className="h-4 w-4 text-primary mt-0.5" />
                <span>Enable two-factor authentication</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Last Password Change</h3>
            <p className="text-sm text-muted-foreground">
              {securityData?.lastPasswordChange
                ? new Date(securityData.lastPasswordChange).toLocaleDateString()
                : 'Never changed'}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Login Alerts</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get notified about unrecognized logins
            </p>
            <Button variant="outline" className="w-full">
              Configure Alerts
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
