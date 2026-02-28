import { Shield, Database, AlertTriangle, Settings, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { RoleBasedSection } from '@/components/auth/RoleBasedLayout';
import { OrganizationHeader } from '@/components/admin/OrganizationHeader';
import { AdminStats } from '@/components/admin/AdminStats';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { SubscriptionStatus } from '@/components/admin/SubscriptionStatus';
import { AICostWidget } from '@/components/admin/AICostWidget';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuthStore();

  // Redirect if user doesn't have access
  if (!isAdmin() && !isManager()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <OrganizationHeader />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Organization overview, statistics, and system administration
        </p>
      </div>

      {/* Real-time Stats */}
      <AdminStats />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Activity & Recent Changes (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Log */}
          <ActivityLog />
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Summary</CardTitle>
              <CardDescription>Key metrics and health indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">System Health</p>
                      <p className="text-sm text-muted-foreground">All systems operational</p>
                    </div>
                  </div>
                  <Badge>Healthy</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-muted-foreground">Last backup: 2 hours ago</p>
                    </div>
                  </div>
                  <Badge>Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Subscription & Quick Actions (1/3 width) */}
        <div className="space-y-6">
          {/* Subscription Status Widget */}
          <SubscriptionStatus />

          {/* AI Cost Widget */}
          <AICostWidget />

          {/* Admin-Only Quick Actions */}
          <RoleBasedSection show="admin">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>System administration tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/system')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/database')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Database Maintenance
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/export')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Data Export Wizard
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/retry-queue')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Queue
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/debug')}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  System Logs
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin/features')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Feature Flags
                </Button>
              </CardContent>
            </Card>
          </RoleBasedSection>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
