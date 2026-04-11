import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CHART_COLORS } from '@/lib/chartColors';
import {
  Users,
  SquareKanban,
  Clock,
  Upload,
  Download,
  History,
  Merge,
  Filter,
  ArrowRight,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { leadsApi } from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { calcRate } from '@/lib/metricsCalculator';

const SOCIAL_MEDIA_SOURCES = ['linkedin', 'instagram', 'facebook ads', 'google ads', 'youtube', 'social media', 'social'];

// Quick-action links for the overview
const quickLinks = [
  { label: 'All Leads', path: '/leads/all', icon: Users, description: 'View & manage all leads' },
  { label: 'Pipeline', path: '/leads/pipeline', icon: SquareKanban, description: 'Kanban board view' },
  { label: 'Follow-ups', path: '/leads/followups', icon: Clock, description: 'Scheduled follow-ups' },
  { label: 'Segments', path: '/leads/segments', icon: Filter, description: 'Lead segmentation' },
  { label: 'Import', path: '/leads/import', icon: Upload, description: 'Import from CSV' },
  { label: 'Export', path: '/leads/export', icon: Download, description: 'Download lead data' },
  { label: 'History', path: '/leads/history', icon: History, description: 'Activity & change log' },
  { label: 'Merge', path: '/leads/merge', icon: Merge, description: 'Merge duplicates' },
];

export default function LeadsOverview() {
  // Fetch global stats
  const { data: stats, isError, refetch } = useQuery({
    queryKey: ['leads-global-stats'],
    queryFn: async () => {
      try {
        const response = await leadsApi.getStats();
        return response.data?.stats || null;
      } catch {
        const response = await leadsApi.getLeads({ page: 1, limit: 1 });
        const data = response.data;
        return { total: data?.pagination?.total || 0 };
      }
    },
    staleTime: 60_000,
  });

  const total = stats?.total || 0;
  const qualified = stats?.byStatus?.QUALIFIED || 0;
  const qualifiedRate = calcRate(qualified, total, 0);
  const avgScore = Math.round(stats?.averageScore || 0);
  const won = stats?.byStatus?.WON || 0;
  const lost = stats?.byStatus?.LOST || 0;
  const closedTotal = won + lost;
  const conversionRate = calcRate(won, closedTotal, 0);

  // Source chart data
  const sourceData = useMemo(() => {
    if (!stats?.bySource) return [];
    const entries = Object.entries(stats.bySource as Record<string, number>).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
    // Group social media
    const socialTotal = entries
      .filter(s => SOCIAL_MEDIA_SOURCES.includes(s.name.toLowerCase()))
      .reduce((sum, s) => sum + s.value, 0);
    const nonSocial = entries.filter(s => !SOCIAL_MEDIA_SOURCES.includes(s.name.toLowerCase()));
    const result = socialTotal > 0 ? [...nonSocial, { name: 'Social Media', value: socialTotal }] : nonSocial;
    const sorted = result.sort((a, b) => b.value - a.value);
    const top5 = sorted.slice(0, 5);
    const otherTotal = sorted.slice(5).reduce((sum, s) => sum + s.value, 0);
    if (otherTotal > 0) top5.push({ name: 'Other', value: otherTotal });
    return top5;
  }, [stats]);

  // Score distribution data
  const scoreData = useMemo(() => {
    if (stats?.scoreDistribution) {
      return stats.scoreDistribution as Array<{ range: string; count: number }>;
    }
    return [];
  }, [stats]);

  return (
    <div className="space-y-6">
      {isError && <ErrorBanner message="Failed to load lead statistics" retry={refetch} />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-1 text-muted-foreground">Overview of your lead pipeline and performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
              <h2 className="mt-2 text-3xl font-bold">{total}</h2>
              <p className="mt-1 text-xs text-muted-foreground">All-time leads</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Qualified Rate</p>
              <h2 className="mt-2 text-3xl font-bold">{qualifiedRate}%</h2>
              <p className="mt-1 text-xs text-muted-foreground">{qualified} of {total} leads qualified</p>
            </div>
            <div className="rounded-full bg-success/10 p-3">
              <Target className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Lead Score</p>
              <h2 className="mt-2 text-3xl font-bold">{avgScore}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Across {total} leads</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
              <h2 className="mt-2 text-3xl font-bold">{conversionRate}%</h2>
              <p className="mt-1 text-xs text-muted-foreground">{won} won of {closedTotal} closed</p>
            </div>
            <div className="rounded-full bg-warning/10 p-3">
              <Target className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Lead Source Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {total > 0 ? `Based on all ${total} leads` : 'No lead data yet'}
          </p>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[0]} name="Leads" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No source data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Lead Score Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Score ranges across all leads</p>
          {scoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={CHART_COLORS[0]} name="Number of Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No score data available
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Navigate to common lead management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors group">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
