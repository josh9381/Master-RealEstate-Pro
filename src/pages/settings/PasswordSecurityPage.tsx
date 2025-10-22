import { useState } from 'react'
import { Lock, Key, Shield, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'

export default function PasswordSecurityPage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error('Failed to update password');
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
                <div className="text-sm text-muted-foreground">Use an app like Google Authenticator</div>
              </div>
              <Button variant="outline">Enable</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">SMS Authentication</div>
                <div className="text-sm text-muted-foreground">Receive codes via text message</div>
              </div>
              <Button variant="outline">Enable</Button>
            </div>
          </Card>

          {/* Active Sessions */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Active Sessions</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Windows - Chrome</div>
                  <div className="text-sm text-muted-foreground">New York, USA • Active now</div>
                </div>
                <Button variant="outline" size="sm">Revoke</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">iPhone - Safari</div>
                  <div className="text-sm text-muted-foreground">Los Angeles, USA • 2 hours ago</div>
                </div>
                <Button variant="outline" size="sm">Revoke</Button>
              </div>
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
            <p className="text-sm text-muted-foreground">March 15, 2024</p>
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
