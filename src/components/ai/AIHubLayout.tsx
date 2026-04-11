import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageEmptyState } from '@/components/ui/PageEmptyState';
import {
  Brain,
  Target,
  TrendingUp,
  Sparkles,
  BarChart3,
  Settings,
  Building2,
  DollarSign,
  Search,
  ChevronRight,
  Menu,
  X,
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

const aiNav: NavGroup[] = [
  {
    id: 'models',
    label: 'Models',
    items: [
      {
        id: 'lead-scoring',
        label: 'Lead Scoring',
        path: '/ai/lead-scoring',
        icon: Target,
        description: 'AI-powered lead scoring',
        keywords: ['score', 'scoring', 'model', 'predict', 'lead', 'rank'],
      },
      {
        id: 'segmentation',
        label: 'Segmentation',
        path: '/ai/segmentation',
        icon: Sparkles,
        description: 'AI-driven segmentation',
        keywords: ['segment', 'group', 'cluster', 'audience', 'ai'],
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        id: 'intelligence-hub',
        label: 'Intelligence Hub',
        path: '/ai/intelligence',
        icon: TrendingUp,
        description: 'Insights & predictions',
        keywords: ['insight', 'prediction', 'forecast', 'trend', 'intelligence'],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/ai/analytics',
        icon: BarChart3,
        description: 'AI performance analytics',
        keywords: ['analytics', 'performance', 'metrics', 'stats', 'chart'],
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    items: [
      {
        id: 'ai-settings',
        label: 'AI Settings',
        path: '/ai/settings',
        icon: Settings,
        description: 'Personal AI preferences',
        keywords: ['settings', 'config', 'preference', 'personal', 'api key'],
      },
      {
        id: 'org-settings',
        label: 'Org AI Settings',
        path: '/ai/org-settings',
        icon: Building2,
        description: 'Organization AI config',
        keywords: ['org', 'organization', 'team', 'admin', 'global'],
      },
      {
        id: 'cost-dashboard',
        label: 'Cost Dashboard',
        path: '/ai/cost-dashboard',
        icon: DollarSign,
        description: 'AI usage & costs',
        keywords: ['cost', 'usage', 'billing', 'spend', 'tokens', 'budget'],
      },
    ],
  },
];

interface AIHubLayoutProps {
  children: React.ReactNode;
}

export const AIHubLayout = ({ children }: AIHubLayoutProps) => {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isHub = location.pathname === '/ai';

  const filteredNav = useMemo(() => {
    if (!search.trim()) return aiNav;
    const q = search.toLowerCase();
    return aiNav
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
    <div className="flex min-h-[calc(100vh-8rem)] -mx-6 -mb-6">
      {/* Mobile sidebar toggle */}
      <button
        className="fixed top-20 left-4 z-50 lg:hidden p-2 rounded-md bg-background border shadow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'w-72 border-r bg-muted/30 flex-shrink-0 overflow-y-auto',
        'fixed inset-y-0 left-0 z-40 lg:static lg:z-auto',
        'transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">AI Hub</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search AI features..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              name="ai-nav-search"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-6">
            {/* Overview link */}
            <div>
              <Link
                to="/ai"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isHub
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent transition-colors hover:text-foreground'
                )}
              >
                <Brain className="h-4 w-4" />
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
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent transition-colors hover:text-foreground'
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
              <PageEmptyState
                icon={<Search className="h-8 w-8" />}
                title={`No items found for "${search}"`}
                className="px-3 py-8"
              />
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
