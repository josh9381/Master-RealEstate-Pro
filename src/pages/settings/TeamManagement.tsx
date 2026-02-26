import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Mail, MoreVertical, Crown, X, Trash2, Edit2, Upload, Activity, Award, CheckCircle2, RefreshCw } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { teamsApi } from '@/lib/api';

const TeamManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionEditor, setShowPermissionEditor] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Sales Rep');
  
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'Owner',
      status: 'active' as const,
      lastActive: '2 minutes ago',
      avatar: 'JD',
      isOnline: true,
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@company.com',
      role: 'Admin',
      status: 'active' as const,
      lastActive: '5 minutes ago',
      avatar: 'SJ',
      isOnline: true,
    },
    {
      id: 3,
      name: 'Mike Smith',
      email: 'mike.s@company.com',
      role: 'Manager',
      status: 'active' as const,
      lastActive: '1 hour ago',
      avatar: 'MS',
      isOnline: false,
    },
    {
      id: 4,
      name: 'Emily Brown',
      email: 'emily.b@company.com',
      role: 'Sales Rep',
      status: 'active' as const,
      lastActive: '30 minutes ago',
      avatar: 'EB',
      isOnline: true,
    },
    {
      id: 5,
      name: 'David Lee',
      email: 'david.l@company.com',
      role: 'Sales Rep',
      status: 'invited' as const,
      lastActive: 'Pending',
      avatar: 'DL',
      isOnline: false,
    },
  ]);

  const { data: teamData, isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => {
      const response = await teamsApi.getTeams();
      const membersResponse = await teamsApi.getMembers(response.teams[0]?.id || 1);
      return membersResponse.members || [];
    },
  });

  useEffect(() => {
    if (teamData) {
      setTeamMembers(teamData);
    }
  }, [teamData]);

  const handleRefresh = () => {
    refetch();
  };

  const activityLogs = [
    { user: 'Sarah Johnson', action: 'Updated lead status', time: '5 min ago' },
    { user: 'Mike Smith', action: 'Created new campaign', time: '1 hour ago' },
    { user: 'Emily Brown', action: 'Sent 12 emails', time: '2 hours ago' },
    { user: 'John Doe', action: 'Modified team permissions', time: '3 hours ago' },
  ];

  const leaderboardData = [
    { name: 'Sarah Johnson', leads: 45, deals: 12, revenue: '$45,000', avatar: 'SJ' },
    { name: 'Emily Brown', leads: 38, deals: 10, revenue: '$38,500', avatar: 'EB' },
    { name: 'Mike Smith', leads: 32, deals: 8, revenue: '$32,000', avatar: 'MS' },
    { name: 'David Lee', leads: 28, deals: 7, revenue: '$28,500', avatar: 'DL' },
  ];

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      await teamsApi.inviteMember('1', { email: inviteEmail, role: inviteRole });
      
      const newMember = {
        id: teamMembers.length + 1,
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'invited' as const,
        lastActive: 'Pending',
        avatar: inviteEmail.substring(0, 2).toUpperCase(),
        isOnline: false,
      };
      setTeamMembers([...teamMembers, newMember]);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const resendInvite = async (email: string) => {
    try {
      await teamsApi.inviteMember('1', { email, role: 'Sales Rep' });
      toast.success(`Invitation resent to ${email}`);
    } catch (error) {
      console.error('Failed to resend invite:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const removeMember = async (id: number) => {
    try {
      await teamsApi.removeMember('1', String(id));
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      toast.success('Team member removed');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const editMember = (id: number) => {
    toast.info(`Edit member ${id} - opens edit dialog`);
  };

  const bulkImportUsers = () => {
    toast.success('3 users imported successfully');
    setShowBulkImport(false);
  };

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
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invite Team Member</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <select 
                  className="w-full px-4 py-2 border rounded-md"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option>Sales Rep</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleInvite} disabled={saving}>
                  <Mail className="h-4 w-4 mr-2" />
                  {saving ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button variant="outline" onClick={() => setShowInviteModal(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bulk Import Users</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowBulkImport(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Upload a CSV file with user information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop or click to upload
                </p>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>CSV format: email, name, role</p>
                <p>Example: john@company.com, John Doe, Sales Rep</p>
              </div>
              <Button className="w-full" onClick={bulkImportUsers}>
                <Upload className="h-4 w-4 mr-2" />
                Import Users
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">Manage your team members and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching && !loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary" onClick={() => setShowActivityLogs(!showActivityLogs)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {teamMembers.filter(m => m.status === 'invited').length} pending invitation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.filter(m => m.isOnline).length}</div>
            <p className="text-xs text-muted-foreground">Online users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{10 - teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Out of 10 total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => setShowLeaderboard(!showLeaderboard)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sarah J.</div>
            <p className="text-xs text-muted-foreground">Click to view leaderboard</p>
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
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                      {member.avatar}
                    </div>
                    {member.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
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
                      {member.isOnline && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          Online
                        </Badge>
                      )}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resendInvite(member.email)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invite
                    </Button>
                  )}
                  {member.role !== 'Owner' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => editMember(member.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  {member.role === 'Owner' && (
                    <Button variant="ghost" size="sm" disabled>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Define what each role can do in your workspace</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowPermissionEditor(!showPermissionEditor)}>
              <Edit2 className="h-4 w-4 mr-2" />
              {showPermissionEditor ? 'Hide' : 'Edit'} Permissions
            </Button>
          </div>
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

      {/* Permission Editor */}
      {showPermissionEditor && (
        <Card>
          <CardHeader>
            <CardTitle>Permission Editor</CardTitle>
            <CardDescription>Visual toggle grid for role permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Permission</th>
                    <th className="text-center py-3 px-4">Owner</th>
                    <th className="text-center py-3 px-4">Admin</th>
                    <th className="text-center py-3 px-4">Manager</th>
                    <th className="text-center py-3 px-4">Sales Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'View leads',
                    'Create leads',
                    'Delete leads',
                    'Send campaigns',
                    'View analytics',
                    'Manage team',
                    'Billing access',
                    'Integration management',
                  ].map((permission) => (
                    <tr key={permission} className="border-b">
                      <td className="py-3 px-4">{permission}</td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        {['View leads', 'Create leads', 'Send campaigns', 'View analytics'].includes(permission) && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {['View leads', 'Send campaigns'].includes(permission) && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Logs */}
      {showActivityLogs && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent team member activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowActivityLogs(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{log.user}</p>
                      <p className="text-xs text-muted-foreground">{log.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{log.time}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Performance Leaderboard */}
      {showLeaderboard && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Performance Leaderboard</CardTitle>
                <CardDescription>Top performers this month</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboardData.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>{member.leads} leads</span>
                        <span>{member.deals} deals</span>
                        <span className="text-green-600 font-medium">{member.revenue}</span>
                      </div>
                    </div>
                  </div>
                  {index === 0 && <Award className="h-6 w-6 text-yellow-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Invite removed since we have modal */}
        </>
      )}
    </div>
  );
};

export default TeamManagement;
