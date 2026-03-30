import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Megaphone,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Calendar,
  BarChart3,
  FlaskConical,
  Search,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  keywords: string[];
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const campaignsNav: NavGroup[] = [
  {
    id: 'channels',
    label: 'Channels',
    items: [
      {
        id: 'email',
        label: 'Email Campaigns',
        path: '/campaigns?type=email',
        icon: Mail,
        description: 'Email marketing campaigns',
        keywords: ['email', 'sendgrid', 'newsletter', 'drip'],
      },
      {
        id: 'sms',
        label: 'SMS Campaigns',
        path: '/campaigns?type=sms',
        icon: MessageSquare,
        description: 'Text message campaigns',
        keywords: ['sms', 'text', 'message', 'twilio'],
      },
      {
        id: 'phone',
        label: 'Phone Campaigns',
        path: '/campaigns?type=phone',
        icon: Phone,
        description: 'Voice call campaigns',
        keywords: ['phone', 'call', 'voice', 'telephony'],
        badge: 'Coming Soon',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      {
        id: 'templates',
        label: 'Templates',
        path: '/campaigns/templates',
        icon: FileText,
        description: 'Campaign templates',
        keywords: ['template', 'design', 'layout', 'reuse'],
      },
      {
        id: 'schedule',
        label: 'Schedule',
        path: '/campaigns/schedule',
        icon: Calendar,
        description: 'Scheduled campaigns',
        keywords: ['schedule', 'calendar', 'plan', 'queue', 'timing'],
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/campaigns/reports',
        icon: BarChart3,
        description: 'Campaign analytics & reports',
        keywords: ['report', 'analytics', 'stats', 'performance', 'metrics'],
      },
      {
        id: 'ab-testing',
        label: 'A/B Testing',
        path: '/campaigns/ab-testing',
        icon: FlaskConical,
        description: 'Split test campaigns',
        keywords: ['ab', 'test', 'split', 'experiment', 'variant'],
      },
    ],
  },
];

interface CampaignsLayoutProps {
  children: React.ReactNode;
}

export const CampaignsLayout = ({ children }: CampaignsLayoutProps) => {
  const location = useLocation();
  const [search, setSearch] = useState('');

  const isHub =
    location.pathname === '/campaigns' && !location.search.includes('type=');

  const filteredNav = useMemo(() => {
    if (!search.trim()) return campaignsNav;
    const q = search.toLowerCase();
    return campaignsNav
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

  const isItemActive = (item: NavItem) => {
    // Handle query-param based paths like /campaigns?type=email
    if (item.path.includes('?')) {
      const [basePath, query] = item.path.split('?');
      const params = new URLSearchParams(query);
      const currentParams = new URLSearchParams(location.search);
      return (
        location.pathname === basePath &&
        params.get('type') === currentParams.get('type')
      );
    }
    return (
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] -mx-6 -mt-2 -mb-6">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-2">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Campaigns</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns menu..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              name="campaigns-nav-search"
            />
          </div>

          {/* Create Campaign Button */}
          <div className="px-1">
            <UsageBadge resource="campaigns" />
            <FeatureGate resource="campaigns">
              <Link to="/campaigns/create" className="block mt-2">
                <Button size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
            </FeatureGate>
          </div>

          {/* Navigation */}
          <nav className="space-y-6">
            {/* Overview link */}
            <div>
              <Link
                to="/campaigns"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isHub
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Megaphone className="h-4 w-4" />
                All Campaigns
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
                    const isActive = isItemActive(item);
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
                        {item.badge && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            {item.badge}
                          </Badge>
                        )}
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
                <p className="text-sm text-muted-foreground">No items found for "{search}"</p>
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
