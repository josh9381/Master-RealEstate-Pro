import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Clock,
  Upload,
  Download,
  History,
  Merge,
  Filter,
  Search,
  ChevronRight,
  Plus,
  LayoutList,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FeatureGate, UsageBadge } from '@/components/subscription/FeatureGate';
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

const leadsNav: NavGroup[] = [
  {
    id: 'views',
    label: 'Views',
    items: [
      {
        id: 'all-leads',
        label: 'All Leads',
        path: '/leads/all',
        icon: LayoutList,
        description: 'View & manage all leads',
        keywords: ['all', 'list', 'table', 'grid', 'leads'],
      },
      {
        id: 'followups',
        label: 'Follow-ups',
        path: '/leads/followups',
        icon: Clock,
        description: 'Scheduled follow-ups',
        keywords: ['follow-up', 'followup', 'schedule', 'reminder', 'due'],
      },
      {
        id: 'segments',
        label: 'Segments',
        path: '/leads/segments',
        icon: Filter,
        description: 'Lead segmentation',
        keywords: ['segment', 'group', 'filter', 'audience', 'criteria'],
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      {
        id: 'import',
        label: 'Import',
        path: '/leads/import',
        icon: Upload,
        description: 'Import leads from CSV',
        keywords: ['import', 'csv', 'upload', 'bulk', 'file'],
      },
      {
        id: 'export',
        label: 'Export',
        path: '/leads/export',
        icon: Download,
        description: 'Export leads to file',
        keywords: ['export', 'download', 'csv', 'file', 'backup'],
      },
      {
        id: 'history',
        label: 'History',
        path: '/leads/history',
        icon: History,
        description: 'Activity & change log',
        keywords: ['history', 'log', 'activity', 'changes', 'audit'],
      },
      {
        id: 'merge',
        label: 'Merge',
        path: '/leads/merge',
        icon: Merge,
        description: 'Merge duplicate leads',
        keywords: ['merge', 'duplicate', 'combine', 'dedup'],
      },
    ],
  },
];

interface LeadsLayoutProps {
  children: React.ReactNode;
}

export const LeadsLayout = ({ children }: LeadsLayoutProps) => {
  const location = useLocation();
  const [search, setSearch] = useState('');

  const isHub = location.pathname === '/leads';

  const filteredNav = useMemo(() => {
    if (!search.trim()) return leadsNav;
    const q = search.toLowerCase();
    return leadsNav
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
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Leads</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads menu..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              name="leads-nav-search"
            />
          </div>

          {/* Add Lead Button */}
          <div className="px-1">
            <UsageBadge resource="leads" />
            <FeatureGate resource="leads">
              <Link to="/leads/create" className="block mt-2">
                <Button size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Lead
                </Button>
              </Link>
            </FeatureGate>
          </div>

          {/* Navigation */}
          <nav className="space-y-6">
            {/* Overview link */}
            <div>
              <Link
                to="/leads"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isHub
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Users className="h-4 w-4" />
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
