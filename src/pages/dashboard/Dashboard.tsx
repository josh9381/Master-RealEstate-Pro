import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Megaphone,
  Plus,
  Calendar,
  Download,
  RefreshCw,
  Bell,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  Filter
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { useNavigate } from 'react-router-dom'

const stats = [
  {
    name: 'Total Revenue',
    value: '$45,231',
    change: '+20.1%',
    trend: 'up',
    icon: DollarSign,
    target: '$50,000',
    progress: 90
  },
  {
    name: 'Total Leads',
    value: '2,345',
    change: '+15.3%',
    trend: 'up',
    icon: Users,
    target: '3,000',
    progress: 78
  },
  {
    name: 'Conversion Rate',
    value: '18.5%',
    change: '-2.4%',
    trend: 'down',
    icon: Target,
    target: '20%',
    progress: 92
  },
  {
    name: 'Active Campaigns',
    value: '12',
    change: '+3',
    trend: 'up',
    icon: Megaphone,
    target: '15',
    progress: 80
  },
]

const revenueData = [
  { month: 'Jan', revenue: 4000, leads: 180, campaigns: 8 },
  { month: 'Feb', revenue: 3000, leads: 140, campaigns: 6 },
  { month: 'Mar', revenue: 5000, leads: 220, campaigns: 10 },
  { month: 'Apr', revenue: 4500, leads: 190, campaigns: 9 },
  { month: 'May', revenue: 6000, leads: 260, campaigns: 12 },
  { month: 'Jun', revenue: 5500, leads: 240, campaigns: 11 },
]

const conversionData = [
  { stage: 'New', count: 450, rate: 100 },
  { stage: 'Contacted', count: 340, rate: 76 },
  { stage: 'Qualified', count: 220, rate: 49 },
  { stage: 'Proposal', count: 120, rate: 27 },
  { stage: 'Won', count: 85, rate: 19 },
]

const campaignPerformance = [
  { name: 'Email', opens: 1240, clicks: 340, conversions: 68 },
  { name: 'SMS', opens: 980, clicks: 520, conversions: 104 },
  { name: 'Phone', opens: 0, clicks: 0, conversions: 45 },
  { name: 'Social', opens: 2100, clicks: 680, conversions: 92 },
]

const leadSourceData = [
  { name: 'Website', value: 35, color: '#3b82f6' },
  { name: 'Referral', value: 25, color: '#10b981' },
  { name: 'Social Media', value: 20, color: '#f59e0b' },
  { name: 'Email Campaign', value: 15, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#6b7280' },
]

const recentActivities = [
  { id: 1, type: 'lead', action: 'New lead created', lead: 'John Doe - Tech Corp', time: '5 min ago', icon: Users },
  { id: 2, type: 'email', action: 'Email sent', lead: 'Q4 Product Launch Campaign', time: '12 min ago', icon: Mail },
  { id: 3, type: 'call', action: 'Call completed', lead: 'Jane Smith - Enterprise Inc', time: '24 min ago', icon: Phone },
  { id: 4, type: 'deal', action: 'Deal won', lead: '$25,000 - Global Solutions', time: '1 hour ago', icon: CheckCircle2 },
  { id: 5, type: 'meeting', action: 'Meeting scheduled', lead: 'Bob Johnson - Startup Co', time: '2 hours ago', icon: Calendar },
  { id: 6, type: 'lead', action: 'Lead qualified', lead: 'Alice Brown - Fortune 500', time: '3 hours ago', icon: Target },
]

const upcomingTasks = [
  { id: 1, title: 'Follow up with Tech Corp', due: 'Today, 2:00 PM', priority: 'high', status: 'pending' },
  { id: 2, title: 'Send proposal to Enterprise Inc', due: 'Today, 4:30 PM', priority: 'high', status: 'pending' },
  { id: 3, title: 'Demo call with Startup Co', due: 'Tomorrow, 10:00 AM', priority: 'medium', status: 'scheduled' },
  { id: 4, title: 'Review contract for Global Solutions', due: 'Tomorrow, 2:00 PM', priority: 'medium', status: 'in_progress' },
  { id: 5, title: 'Quarterly review meeting', due: 'Friday, 9:00 AM', priority: 'low', status: 'scheduled' },
]

const topCampaigns = [
  { id: 1, name: 'Q4 Product Launch', type: 'Email', opens: 2340, clicks: 680, conversions: 145, roi: '340%' },
  { id: 2, name: 'Holiday Promotion', type: 'SMS', opens: 1890, clicks: 920, conversions: 198, roi: '420%' },
  { id: 3, name: 'Webinar Invitation', type: 'Email', opens: 1560, clicks: 520, conversions: 89, roi: '280%' },
]

const quickStats = [
  { label: 'Open Emails', value: '1,234', change: '+12%' },
  { label: 'Meetings Today', value: '8', change: '+2' },
  { label: 'Calls Made', value: '45', change: '+18%' },
  { label: 'Tasks Completed', value: '23/30', change: '77%' },
]

function Dashboard() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleExport = () => {
    // Mock export functionality
    const data = JSON.stringify({ stats, revenueData, conversionData }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard-data.json'
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <select
            className="px-3 py-2 text-sm border rounded-md"
            value={dateRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button onClick={() => navigate('/leads/create')} className="h-auto py-4 flex-col gap-2">
          <Plus className="h-5 w-5" />
          <span>New Lead</span>
        </Button>
        <Button onClick={() => navigate('/campaigns/create')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Megaphone className="h-5 w-5" />
          <span>New Campaign</span>
        </Button>
        <Button onClick={() => navigate('/communication')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Mail className="h-5 w-5" />
          <span>Send Email</span>
        </Button>
        <Button onClick={() => navigate('/calendar')} variant="outline" className="h-auto py-4 flex-col gap-2">
          <Calendar className="h-5 w-5" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Main Stats Cards with Progress */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="flex items-center text-xs text-muted-foreground">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {stat.change}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">Goal: {stat.target}</span>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {quickStats.map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Badge variant="secondary" className="text-xs">{item.change}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue & Performance Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue & Leads Trend</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">6-month overview</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="leads" stroke="#10b981" fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conversion Funnel</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Lead progression</p>
            </div>
            <Badge>19% Overall</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="stage" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Distribution by channel</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {leadSourceData.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                      <span className="text-sm">{source.name}</span>
                    </div>
                    <span className="text-sm font-medium">{source.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">By channel</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="opens" fill="#3b82f6" />
                <Bar dataKey="clicks" fill="#10b981" />
                <Bar dataKey="conversions" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Tasks Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="mt-1 p-2 rounded-full bg-primary/10">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.lead}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                  <input type="checkbox" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'warning' : 'secondary'
                      } className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{task.due}</span>
                      <Badge variant="outline" className="text-xs ml-2">{task.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Based on ROI and conversions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            View All Campaigns
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium">Campaign</th>
                  <th className="pb-3 text-left text-sm font-medium">Type</th>
                  <th className="pb-3 text-right text-sm font-medium">Opens</th>
                  <th className="pb-3 text-right text-sm font-medium">Clicks</th>
                  <th className="pb-3 text-right text-sm font-medium">Conversions</th>
                  <th className="pb-3 text-right text-sm font-medium">ROI</th>
                  <th className="pb-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-4 text-sm font-medium">{campaign.name}</td>
                    <td className="py-4">
                      <Badge variant="secondary">{campaign.type}</Badge>
                    </td>
                    <td className="py-4 text-sm text-right">{campaign.opens.toLocaleString()}</td>
                    <td className="py-4 text-sm text-right">{campaign.clicks.toLocaleString()}</td>
                    <td className="py-4 text-sm text-right font-medium">{campaign.conversions}</td>
                    <td className="py-4 text-sm text-right">
                      <Badge variant="success">{campaign.roi}</Badge>
                    </td>
                    <td className="py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Notifications */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            <CardTitle>Alerts & Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">3 leads haven't been contacted in over 7 days</p>
                <p className="text-xs text-muted-foreground mt-1">These leads may become cold. Consider reaching out soon.</p>
              </div>
              <Button size="sm" variant="outline">Review</Button>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Q4 Product Launch campaign exceeded targets!</p>
                <p className="text-xs text-muted-foreground mt-1">145 conversions vs. 100 goal. Great job!</p>
              </div>
              <Button size="sm" variant="outline">View Campaign</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
