import { useState } from 'react';
import { Users, UserPlus, Shield, Crown, Mail, MoreVertical, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { TeamManagement as TeamManagementComponent } from '@/components/admin/TeamManagement';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { RoleBasedSection } from '@/components/auth/RoleBasedLayout';

/**
 * Team Management Page - Admin/Manager view for user administration
 * This is different from the AdminPanel which shows org-wide stats
 * Focus: User accounts, roles, permissions, and team activity
 */
const TeamManagementPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuthStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Redirect if user doesn't have access
  if (!isAdmin() && !isManager()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to manage team members.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Online members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>

        <RoleBasedSection show="admin">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Crown className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Administrator roles</p>
            </CardContent>
          </Card>
        </RoleBasedSection>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Team List (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {isAdmin() 
                      ? 'Manage user accounts, roles, and permissions' 
                      : 'View team members and their roles'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TeamManagementComponent />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity (1/3 width) */}
        <div className="space-y-6">
          <ActivityLog />

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
              <CardDescription>Team member roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">Admin</span>
                </div>
                <Badge>2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Manager</span>
                </div>
                <Badge>3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">User</span>
                </div>
                <Badge>7</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <RoleBasedSection show="admin">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  Bulk Import Users
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  Export Team List
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>
          </RoleBasedSection>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>Send an invitation to join your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="colleague@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option>User</option>
                  <option>Manager</option>
                  {isAdmin() && <option>Admin</option>}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setShowInviteModal(false);
                  // TODO: Implement invite logic
                }}>
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamManagementPage;
