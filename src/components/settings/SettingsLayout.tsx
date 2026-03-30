import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Settings,
  User,
  Building2,
  Shield,
  Bell,
  Mail,
  Phone,
  Tag,
  List,
  FileCheck,
  Users,
  Cloud,
  Search,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  keywords: string[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const settingsNav: NavGroup[] = [
  {
    id: 'personal',
    label: 'Personal',
    items: [
      {
        id: 'profile',
        label: 'Profile',
        path: '/settings/profile',
        icon: User,
        description: 'Name, email, avatar, preferences',
        keywords: ['name', 'email', 'avatar', 'photo', 'timezone', 'language', 'phone', 'personal'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/settings/notifications',
        icon: Bell,
        description: 'Email, push, SMS alerts',
        keywords: ['alerts', 'email', 'push', 'sms', 'sound', 'quiet hours', 'digest'],
      },
      {
        id: 'security',
        label: 'Security',
        path: '/settings/security',
        icon: Shield,
        description: 'Password, 2FA, sessions',
        keywords: ['password', '2fa', 'two-factor', 'sessions', 'authentication', 'login'],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    items: [
      {
        id: 'business',
        label: 'Business Info',
        path: '/settings/business',
        icon: Building2,
        description: 'Company details & branding',
        keywords: ['company', 'logo', 'address', 'tax', 'branding', 'industry'],
      },
      {
        id: 'team',
        label: 'Team',
        path: '/admin/team',
        icon: Users,
        description: 'Members, roles & permissions',
        keywords: ['team', 'members', 'roles', 'permissions', 'invite', 'users'],
      },
      {
        id: 'tags',
        label: 'Tags',
        path: '/settings/tags',
        icon: Tag,
        description: 'Lead tags & categories',
        keywords: ['tags', 'labels', 'categories', 'organize'],
      },
      {
        id: 'custom-fields',
        label: 'Custom Fields',
        path: '/settings/custom-fields',
        icon: List,
        description: 'Custom data fields for leads',
        keywords: ['fields', 'custom', 'data', 'form', 'dropdown', 'text'],
      },
    ],
  },
  {
    id: 'channels',
    label: 'Channels & Integrations',
    items: [
      {
        id: 'email',
        label: 'Email (SendGrid)',
        path: '/settings/email',
        icon: Mail,
        description: 'SMTP, sender info, delivery',
        keywords: ['email', 'sendgrid', 'smtp', 'sender', 'delivery', 'api key'],
      },
      {
        id: 'twilio',
        label: 'SMS & Voice (Twilio)',
        path: '/settings/twilio',
        icon: Phone,
        description: 'Phone numbers, SMS config',
        keywords: ['sms', 'twilio', 'phone', 'voice', 'call', 'text'],
      },
      {
        id: 'google',
        label: 'Google Workspace',
        path: '/settings/google',
        icon: Globe,
        description: 'Gmail, Calendar, Contacts',
        keywords: ['google', 'gmail', 'calendar', 'contacts', 'workspace'],
      },
      {
        id: 'services',
        label: 'Services',
        path: '/settings/services',
        icon: Cloud,
        description: 'Cloud storage, webhooks, APIs',
        keywords: ['services', 'cloud', 'storage', 'webhooks', 'api', 's3', 'azure'],
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Legal',
    items: [
      {
        id: 'compliance',
        label: 'Compliance',
        path: '/settings/compliance',
        icon: FileCheck,
        description: 'TCPA, GDPR, DNC, CCPA',
        keywords: ['tcpa', 'gdpr', 'ccpa', 'dnc', 'compliance', 'consent', 'audit', 'data retention'],
      },
    ],
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const location = useLocation();
  const [search, setSearch] = useState('');

  const isHub = location.pathname === '/settings';

  const filteredNav = useMemo(() => {
    if (!search.trim()) return settingsNav;
    const q = search.toLowerCase();
    return settingsNav
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] -mx-6 -mt-2 -mb-6">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Settings</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              name="settings-nav-search"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-6">
            {/* Overview link */}
            <div>
              <Link
                to="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isHub
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Settings className="h-4 w-4" />
                Overview
              </Link>
            </div>

            {filteredNav.map((group) => (
              <div key={group.id}>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path ||
                      location.pathname.startsWith(item.path + '/');
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {search && filteredNav.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No settings found for "{search}"</p>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
