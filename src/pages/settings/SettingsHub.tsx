import { useState } from 'react';
import {
  User,
  Building2,
  Shield,
  Mail,
  Phone,
  Tag,
  Cloud,
  Sparkles,
  ChevronRight,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// ── Setup progress tracker ──────────────────────────────────────
interface SetupItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  complete: boolean;
}

function SetupProgress({ items }: { items: SetupItem[] }) {
  const done = items.filter((i) => i.complete).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const incomplete = items.filter((i) => !i.complete);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Setup Progress</CardTitle>
            <CardDescription>{done} of {total} steps complete</CardDescription>
          </div>
          <div className="relative h-14 w-14">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                className={pct === 100 ? 'text-green-500' : 'text-primary'}
                strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {pct}%
            </span>
          </div>
        </div>
      </CardHeader>
      {incomplete.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Next Steps</p>
          {incomplete.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} to={item.path}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-colors">
                  <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/40">
                    <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </CardContent>
      )}
      {incomplete.length === 0 && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">All set! Your workspace is fully configured.</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main overview ───────────────────────────────────────────────
const SettingsHub = () => {
  const [showTour, setShowTour] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Fetch live status from APIs
  const { data: profileData } = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => {
      const response = await settingsApi.getProfile();
      return response.data?.user || response.data;
    },
  });

  const { data: securityData } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: async () => {
      const settings = await settingsApi.getSecuritySettings();
      return settings?.data || settings;
    },
  });

  const { data: emailConfigData } = useQuery({
    queryKey: ['settings', 'emailConfig'],
    queryFn: async () => {
      const response = await settingsApi.getEmailConfig();
      return response?.config;
    },
  });

  const { data: smsConfigData } = useQuery({
    queryKey: ['settings', 'sms'],
    queryFn: async () => {
      try { return await settingsApi.getSMSConfig(); } catch { return null; }
    },
  });

  const { data: businessData } = useQuery({
    queryKey: ['settings', 'business'],
    queryFn: async () => settingsApi.getBusinessSettings(),
  });

  // Derived statuses
  const securityScore = securityData?.securityScore ?? 0;
  const has2FA = securityData?.twoFactorEnabled;
  const emailConfigured = !!(emailConfigData?.isActive && (emailConfigData?.hasApiKey || emailConfigData?.apiKey));
  const smsConfigured = !!(smsConfigData?.accountSid || smsConfigData?.isActive);
  const profileComplete = !!(user?.firstName && user?.email);
  const businessComplete = !!(businessData?.companyName);

  // Setup items
  const setupItems: SetupItem[] = [
    { id: 'profile', label: 'Complete Your Profile', description: 'Add your name, photo, and contact info', path: '/settings/profile', icon: User, complete: profileComplete },
    { id: 'business', label: 'Set Up Business Info', description: 'Company name, logo, and address', path: '/settings/business', icon: Building2, complete: businessComplete },
    { id: 'security', label: 'Strengthen Security', description: 'Enable 2FA and set a strong password', path: '/settings/security', icon: Shield, complete: securityScore >= 70 },
    { id: 'email', label: 'Configure Email', description: 'Connect SendGrid for email delivery', path: '/settings/email', icon: Mail, complete: emailConfigured },
    { id: 'sms', label: 'Set Up SMS & Voice', description: 'Connect Twilio for messaging', path: '/settings/twilio', icon: Phone, complete: smsConfigured },
  ];

  // Quick actions
  const quickActions = [
    { label: 'Change Password', icon: Lock, path: '/settings/security', color: 'text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-400' },
    { label: 'Enable 2FA', icon: Key, path: '/settings/security', color: 'text-green-600 bg-green-100 dark:bg-green-950 dark:text-green-400' },
    { label: 'Update Profile', icon: User, path: '/settings/profile', color: 'text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-400' },
    { label: 'Configure Email', icon: Mail, path: '/settings/email', color: 'text-orange-600 bg-orange-100 dark:bg-orange-950 dark:text-orange-400' },
    { label: 'Set Up SMS', icon: Phone, path: '/settings/twilio', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400' },
    { label: 'Manage Tags', icon: Tag, path: '/settings/tags', color: 'text-pink-600 bg-pink-100 dark:bg-pink-950 dark:text-pink-400' },
  ];

  // Security score styling
  const scoreColor = securityScore >= 80 ? 'text-green-600 dark:text-green-400' : securityScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  const scoreBg = securityScore >= 80 ? 'bg-green-100 dark:bg-green-950/40' : securityScore >= 50 ? 'bg-yellow-100 dark:bg-yellow-950/40' : 'bg-red-100 dark:bg-red-950/40';
  const ScoreIcon = securityScore >= 80 ? CheckCircle2 : securityScore >= 50 ? AlertTriangle : AlertCircle;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Your workspace at a glance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowTour(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Getting Started Tour
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Account */}
        <Link to="/settings/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-950/40">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Account</p>
                  <p className="text-lg font-bold truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Not set up'}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                {profileComplete ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Profile complete
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Security */}
        <Link to="/settings/security">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${scoreBg}`}>
                  <Shield className={`h-5 w-5 ${scoreColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                  <p className={`text-lg font-bold ${scoreColor}`}>{securityScore}/100</p>
                </div>
              </div>
              <div className="mt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ScoreIcon className="h-3.5 w-3.5" />
                  {has2FA ? '2FA enabled' : '2FA disabled'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Email */}
        <Link to="/settings/email">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${emailConfigured ? 'bg-green-100 dark:bg-green-950/40' : 'bg-muted'}`}>
                  <Mail className={`h-5 w-5 ${emailConfigured ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Email (SendGrid)</p>
                  <p className="text-lg font-bold">{emailConfigured ? 'Connected' : 'Not Set Up'}</p>
                </div>
              </div>
              <div className="mt-3">
                {emailConfigured ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to send
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" /> API key required
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* SMS */}
        <Link to="/settings/twilio">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${smsConfigured ? 'bg-green-100 dark:bg-green-950/40' : 'bg-muted'}`}>
                  <Phone className={`h-5 w-5 ${smsConfigured ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">SMS & Voice (Twilio)</p>
                  <p className="text-lg font-bold">{smsConfigured ? 'Connected' : 'Not Set Up'}</p>
                </div>
              </div>
              <div className="mt-3">
                {smsConfigured ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to send
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" /> Credentials required
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Setup Progress + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SetupProgress items={setupItems} />
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Frequently used shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.path}>
                      <div className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors text-center group">
                        <div className={`p-2 rounded-lg ${action.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium leading-tight">{action.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Account & Organization Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Account Details</CardTitle>
              <Link to="/settings/profile">
                <Button variant="ghost" size="sm" className="text-xs">
                  Edit <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-4">
              {user?.avatar || profileData?.avatar ? (
                <img src={user?.avatar || profileData?.avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {(user?.firstName?.[0] || 'U')}{(user?.lastName?.[0] || '')}
                </div>
              )}
              <div>
                <p className="font-medium">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'No name set'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="font-medium capitalize">{user?.role?.toLowerCase() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{profileData?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Timezone</p>
                <p className="font-medium">{profileData?.timezone?.replace('America/', '') || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Language</p>
                <p className="font-medium">{profileData?.language === 'en' ? 'English' : profileData?.language || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Organization</CardTitle>
              <Link to="/settings/business">
                <Button variant="ghost" size="sm" className="text-xs">
                  Edit <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-4">
              {businessData?.logo ? (
                <img src={businessData.logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{businessData?.companyName || user?.organization?.name || 'No company set'}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {user?.organization?.subscriptionTier?.toLowerCase() || 'Free'} plan
                  {user?.organization?.memberCount ? ` · ${user.organization.memberCount} members` : ''}
                </p>
              </div>
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Industry</p>
                <p className="font-medium">{businessData?.industry || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Size</p>
                <p className="font-medium">{businessData?.companySize || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Website</p>
                <p className="font-medium truncate">{businessData?.website || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Currency</p>
                <p className="font-medium">{businessData?.currency || 'USD'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Integrations & Channels</CardTitle>
          <CardDescription>Connection status of all your services</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Email (SendGrid)', icon: Mail, status: emailConfigured, path: '/settings/email', detail: emailConfigured ? 'API key active' : 'Not configured' },
              { label: 'SMS & Voice (Twilio)', icon: Phone, status: smsConfigured, path: '/settings/twilio', detail: smsConfigured ? 'Credentials active' : 'Not configured' },
              { label: 'Google Workspace', icon: Globe, status: false, path: '/settings/google', detail: 'Not connected' },
              { label: 'Services & APIs', icon: Cloud, status: false, path: '/settings/services', detail: 'Configure as needed' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} to={item.path}>
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <div className={`p-2 rounded-lg ${item.status ? 'bg-green-100 dark:bg-green-950/40' : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${item.status ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${item.status ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showTour && (
        <OnboardingTour forceShow onComplete={() => setShowTour(false)} />
      )}
    </div>
  );
};

export default SettingsHub;
