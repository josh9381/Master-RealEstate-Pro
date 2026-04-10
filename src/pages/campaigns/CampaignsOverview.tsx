import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Megaphone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  PieChart,
  BarChart3,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { campaignsApi, CampaignsQuery } from '@/lib/api';
import { calcROI, formatRate, fmtMoney } from '@/lib/metricsCalculator';
import { CHART_COLORS } from '@/lib/chartColors';
import { Campaign } from '@/types';

const quickLinks = [
  { label: 'All Campaigns', path: '/campaigns/all', icon: Megaphone, description: 'View & manage all campaigns' },
  { label: 'Email Campaigns', path: '/campaigns/all?type=email', icon: Mail, description: 'Email marketing campaigns' },
  { label: 'SMS Campaigns', path: '/campaigns/all?type=sms', icon: MessageSquare, description: 'Text message campaigns' },
  { label: 'Templates', path: '/campaigns/templates', icon: FileText, description: 'Campaign templates' },
  { label: 'Schedule', path: '/campaigns/schedule', icon: Calendar, description: 'Scheduled campaigns' },
  { label: 'Analytics', path: '/campaigns/analytics', icon: PieChart, description: 'Performance analytics' },
  { label: 'Reports', path: '/campaigns/reports', icon: BarChart3, description: 'Reports & exports' },
  { label: 'A/B Testing', path: '/campaigns/ab-testing', icon: FlaskConical, description: 'Split test campaigns' },
];

export default function CampaignsOverview() {
  const { data: statsResponse } = useQuery({
    queryKey: ['campaigns-overview-stats'],
    queryFn: async () => {
      const params: CampaignsQuery = { page: 1, limit: 200 };
      const response = await campaignsApi.getCampaigns(params);
      return response.data;
    },
    staleTime: 60_000,
  });

  const campaigns = useMemo(() => {
    if (statsResponse?.campaigns && statsResponse.campaigns.length > 0) {
      return statsResponse.campaigns as Campaign[];
    }
    return [];
  }, [statsResponse]);

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent ?? 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue ?? 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent ?? 0), 0);
    const avgROI = totalSpent > 0 ? formatRate(calcROI(totalRevenue, totalSpent)) : '0';
    return { total: campaigns.length, active, totalSent, totalRevenue, avgROI };
  }, [campaigns]);

  // Campaign type breakdown
  const typeData = useMemo(() => {
    if (campaigns.length === 0) return [];
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => {
      const type = (c.type || 'Other').charAt(0).toUpperCase() + (c.type || 'other').slice(1).toLowerCase();
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [campaigns]);

  // Campaign status distribution
  const statusData = useMemo(() => {
    if (campaigns.length === 0) return [];
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => {
      const status = c.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">Overview of your campaign performance and activity</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
              <h3 className="mt-2 text-3xl font-bold">{stats.active}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{stats.total} total campaigns</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
              <h3 className="mt-2 text-3xl font-bold">{stats.totalSent.toLocaleString()}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Across all campaigns</p>
            </div>
            <div className="rounded-full bg-success/10 p-3">
              <Users className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <h3 className="mt-2 text-3xl font-bold">{fmtMoney(stats.totalRevenue)}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Campaign-generated revenue</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average ROI</p>
              <h3 className="mt-2 text-3xl font-bold">{stats.avgROI}%</h3>
              <p className="mt-1 text-xs text-muted-foreground">Return on investment</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Campaign Type Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {stats.total > 0 ? `Based on ${stats.total} campaigns` : 'No campaign data yet'}
          </p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[0]} name="Campaigns" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No campaign data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Campaign Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Current status of all campaigns</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={CHART_COLORS[0]} name="Number of Campaigns" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No status data available
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Navigate to common campaign management tools</CardDescription>
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
