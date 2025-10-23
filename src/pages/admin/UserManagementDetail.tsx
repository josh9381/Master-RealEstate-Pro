import { Users, Mail, Phone, Shield, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

const UserManagementDetail = () => {
  const { toast } = useToast();
  const user = {
    id: 'usr_12345',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    role: 'Sales Manager',
    department: 'Sales',
    status: 'active',
    joinedDate: '2023-06-15',
    lastLogin: '2024-01-15 14:30',
    avatar: 'JD',
  };

  const handleResetPassword = () => {
    if (confirm(`Send password reset email to ${user.email}?`)) {
      toast.success(`Password reset email sent to ${user.email}`);
    }
  };

  const handleSaveChanges = () => {
    if (!user.name || !user.email) {
      toast.error('Name and email are required');
      return;
    }
    toast.success('User details updated successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage user details and permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleResetPassword}>Reset Password</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      </div>

      {/* User Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-blue-600 text-white text-3xl font-bold">
              {user.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{user.role} • {user.department}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Joined {user.joinedDate} • Last login {user.lastLogin}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">User ID</p>
              <p className="text-sm font-mono">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Created</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,567</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>User's personal and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">First Name</label>
              <input
                type="text"
                defaultValue="John"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Last Name</label>
              <input
                type="text"
                defaultValue="Doe"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <input
                type="email"
                defaultValue="john.doe@example.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <select defaultValue="Sales" className="w-full px-3 py-2 border rounded-lg">
                <option>Sales</option>
                <option>Marketing</option>
                <option>Support</option>
                <option>Engineering</option>
                <option>Management</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Job Title</label>
              <input
                type="text"
                defaultValue="Sales Manager"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role & Permissions</CardTitle>
          <CardDescription>User access level and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">User Role</label>
            <select defaultValue="manager" className="w-full px-3 py-2 border rounded-lg">
              <option value="admin">Administrator</option>
              <option value="manager">Manager</option>
              <option value="user">Standard User</option>
              <option value="readonly">Read-Only</option>
            </select>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3">Module Access</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { module: 'Leads', access: true },
                { module: 'Campaigns', access: true },
                { module: 'Analytics', access: true },
                { module: 'Settings', access: false },
                { module: 'Admin', access: false },
                { module: 'Billing', access: false },
              ].map((item) => (
                <label key={item.module} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked={item.access} className="rounded" />
                  <span className="text-sm">{item.module}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3">Special Permissions</h4>
            <div className="space-y-2">
              {[
                'Can delete leads',
                'Can export data',
                'Can manage users',
                'Can access API',
                'Can view reports',
                'Can manage billing',
              ].map((permission) => (
                <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage user security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Add an extra layer of security
              </p>
            </div>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Password Expiry</h4>
              <p className="text-sm text-muted-foreground mt-1">Last changed 45 days ago</p>
            </div>
            <Button variant="outline" size="sm">
              Force Reset
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Active Sessions</h4>
              <p className="text-sm text-muted-foreground mt-1">3 devices currently logged in</p>
            </div>
            <Button variant="outline" size="sm">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>User actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                action: 'Created 3 new leads',
                time: '2 hours ago',
                type: 'create',
              },
              {
                action: 'Sent email campaign "Spring Launch"',
                time: '5 hours ago',
                type: 'email',
              },
              {
                action: 'Updated contact information',
                time: '1 day ago',
                type: 'update',
              },
              {
                action: 'Logged in from new device',
                time: '2 days ago',
                type: 'login',
              },
              {
                action: 'Exported lead data',
                time: '3 days ago',
                type: 'export',
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      activity.type === 'create'
                        ? 'bg-green-500'
                        : activity.type === 'email'
                        ? 'bg-blue-500'
                        : activity.type === 'update'
                        ? 'bg-orange-500'
                        : 'bg-gray-500'
                    }`}
                  />
                  <p className="text-sm">{activity.action}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible user actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Suspend User Account</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Temporarily disable access to the system
              </p>
            </div>
            <Button variant="outline" className="text-orange-600 border-orange-200">
              Suspend Account
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Delete User Account</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently remove user and all associated data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementDetail;
