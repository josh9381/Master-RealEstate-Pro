import { Users, UserPlus, Mail, MoreVertical, Crown, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const TeamManagement = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'Owner',
      status: 'active',
      lastActive: '2 minutes ago',
      avatar: 'JD',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@company.com',
      role: 'Admin',
      status: 'active',
      lastActive: '5 minutes ago',
      avatar: 'SJ',
    },
    {
      id: 3,
      name: 'Mike Smith',
      email: 'mike.s@company.com',
      role: 'Manager',
      status: 'active',
      lastActive: '1 hour ago',
      avatar: 'MS',
    },
    {
      id: 4,
      name: 'Emily Brown',
      email: 'emily.b@company.com',
      role: 'Sales Rep',
      status: 'active',
      lastActive: '30 minutes ago',
      avatar: 'EB',
    },
    {
      id: 5,
      name: 'David Lee',
      email: 'david.l@company.com',
      role: 'Sales Rep',
      status: 'invited',
      lastActive: 'Pending',
      avatar: 'DL',
    },
  ];

  const roles = [
    {
      name: 'Owner',
      description: 'Full access to all features and settings',
      permissions: ['All permissions', 'Billing management', 'Delete workspace'],
      count: 1,
    },
    {
      name: 'Admin',
      description: 'Manage team members and most settings',
      permissions: ['User management', 'Settings access', 'Integration management'],
      count: 1,
    },
    {
      name: 'Manager',
      description: 'Manage campaigns and view analytics',
      permissions: ['Create campaigns', 'View analytics', 'Manage leads'],
      count: 1,
    },
    {
      name: 'Sales Rep',
      description: 'Basic access to leads and campaigns',
      permissions: ['View leads', 'Send campaigns', 'View own analytics'],
      count: 2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">Manage your team members and their permissions</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">1 pending invitation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Online users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Out of 10 total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Owner + Admin</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage team members and their roles</CardDescription>
            </div>
            <Input placeholder="Search members..." className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                    {member.avatar}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{member.name}</h4>
                      {member.role === 'Owner' && <Crown className="h-4 w-4 text-yellow-500" />}
                      <Badge
                        variant={member.status === 'active' ? 'success' : 'warning'}
                        className="text-xs"
                      >
                        {member.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Last active: {member.lastActive}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {member.status === 'invited' && (
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invite
                    </Button>
                  )}
                  {member.role !== 'Owner' && (
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>Define what each role can do in your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <div key={role.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{role.name}</h4>
                  <Badge variant="secondary">{role.count} member{role.count > 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                <div className="space-y-1">
                  {role.permissions.map((permission) => (
                    <div key={permission} className="flex items-center text-sm">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New Member</CardTitle>
          <CardDescription>Send an invitation to join your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input placeholder="email@company.com" className="flex-1" />
            <select className="px-4 py-2 border rounded-md">
              <option>Sales Rep</option>
              <option>Manager</option>
              <option>Admin</option>
            </select>
            <Button>Send Invitation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
