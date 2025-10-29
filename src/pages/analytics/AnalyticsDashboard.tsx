import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Mail, Phone, Target, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [leadAnalytics, setLeadAnalytics] = useState<any>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboard, leads, campaigns] = await Promise.all([
        analyticsApi.getDashboardStats().catch(() => ({ data: null })),
        analyticsApi.getLeadAnalytics().catch(() => ({ data: null })),
        analyticsApi.getCampaignAnalytics().catch(() => ({ data: null }))
      ]);

      setDashboardData(dashboard.data);
      setLeadAnalytics(leads.data);
      setCampaignAnalytics(campaigns.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.toast.error('Error loading analytics', 'Using fallback data');
    } finally {
      setLoading(false);
    }
  };

  // Mock data as fallback
  const getMockRevenueData = () => [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 52000, target: 50000 },
    { month: 'Mar', revenue: 48000, target: 50000 },
    { month: 'Apr', revenue: 61000, target: 55000 },
    { month: 'May', revenue: 55000, target: 55000 },
    { month: 'Jun', revenue: 67000, target: 60000 },
  ];

  const getMockChannelData = () => [
    { name: 'Email', value: 45, color: '#3b82f6' },
    { name: 'Phone', value: 30, color: '#10b981' },
    { name: 'Social', value: 15, color: '#8b5cf6' },
    { name: 'Direct', value: 10, color: '#f59e0b' },
  ];

  const getMockConversionFunnel = () => [
    { stage: 'Visitors', count: 15420 },
    { stage: 'Leads', count: 4567 },
    { stage: 'Qualified', count: 2134 },
    { stage: 'Opportunities', count: 892 },
    { stage: 'Customers', count: 234 },
  ];

  const getMockTeamPerformance = () => [
    { name: 'John D', deals: 45, revenue: 234000 },
    { name: 'Sarah M', deals: 38, revenue: 198000 },
    { name: 'Mike R', deals: 32, revenue: 176000 },
    { name: 'Emma W', deals: 28, revenue: 145000 },
    { name: 'Tom H', deals: 25, revenue: 132000 },
  ];

  // Use API data with fallbacks
  const revenueData = getMockRevenueData();
  const totalRevenue = campaignAnalytics?.performance?.totalRevenue || 328000;
  const totalLeads = dashboardData?.leads?.total || leadAnalytics?.total || 4567;
  const conversionRate = leadAnalytics?.conversionRate || dashboardData?.leads?.conversionRate || 26.2;
  const avgDealSize = totalRevenue / Math.max(totalLeads, 1) || 5234;

  // Channel data from lead sources
  const channelData = leadAnalytics?.bySource 
    ? Object.entries(leadAnalytics.bySource).map(([name, value]: [string, any], index) => ({
        name,
        value: Math.round((value / totalLeads) * 100),
        color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][index] || '#6b7280'
      }))
    : getMockChannelData();

  // Conversion funnel from lead status data
  const conversionFunnel = leadAnalytics?.byStatus
    ? [
        { stage: 'Total Leads', count: totalLeads },
        { stage: 'New', count: leadAnalytics.byStatus.NEW || 0 },
        { stage: 'Qualified', count: leadAnalytics.byStatus.QUALIFIED || 0 },
        { stage: 'Proposal', count: leadAnalytics.byStatus.PROPOSAL || 0 },
        { stage: 'Won', count: leadAnalytics.byStatus.WON || 0 },
      ]
    : getMockConversionFunnel();

  const teamPerformance = getMockTeamPerformance();

  // Campaign performance metrics
  const emailOpenRate = campaignAnalytics?.performance?.openRate || 32.5;
  const emailClickRate = campaignAnalytics?.performance?.clickRate || 8.3;
  const emailConversionRate = campaignAnalytics?.performance?.conversionRate || 4.2;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive view of your business performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadAnalytics}>Refresh</Button>
          <Button>Customize Dashboard</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">
              {campaignAnalytics?.total || 0} campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {leadAnalytics?.byStatus?.NEW || 0} new this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {leadAnalytics?.byStatus?.WON || 0} won deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgDealSize.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <p className="text-xs text-muted-foreground">
              {leadAnalytics?.averageScore || 0} avg score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Conversion Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue vs target</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stackId="2"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Distribution by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead progression through sales stages</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Top performers this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamPerformance.map((member, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="font-semibold text-lg text-muted-foreground w-6">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.deals} deals closed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(member.revenue / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-muted-foreground">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Open Rate</span>
                <span className="font-semibold">{emailOpenRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Click Rate</span>
                <span className="font-semibold">{emailClickRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-semibold">{emailConversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              Task Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Tasks</span>
                <span className="font-semibold">{dashboardData?.tasks?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-semibold">{dashboardData?.tasks?.completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completion Rate</span>
                <span className="font-semibold">{dashboardData?.tasks?.completionRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Open Opportunities</span>
                <span className="font-semibold">892</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pipeline Value</span>
                <span className="font-semibold">$4.2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Forecast</span>
                <span className="font-semibold">$1.1M</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
