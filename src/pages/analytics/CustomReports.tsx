import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const CustomReports = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [campaignData, setCampaignData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      await loadReportsData();
    };
    fetchData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [dashboard, leads, campaigns] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getLeadAnalytics(),
        analyticsApi.getCampaignAnalytics(),
      ]);
      setDashboardData(dashboard);
      setLeadData(leads);
      setCampaignData(campaigns);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const savedReports = [
    {
      id: 1,
      name: 'Monthly Sales Performance',
      description: 'Comprehensive sales metrics and trends',
      type: 'Sales',
      lastRun: '2024-01-15',
      creator: 'John Doe',
    },
    {
      id: 2,
      name: 'Lead Conversion Analysis',
      description: 'Detailed lead-to-customer conversion tracking',
      type: 'Analytics',
      lastRun: '2024-01-14',
      creator: 'Sarah Johnson',
    },
    {
      id: 3,
      name: 'Campaign ROI Report',
      description: 'Return on investment for all campaigns',
      type: 'Marketing',
      lastRun: '2024-01-12',
      creator: 'Mike Wilson',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground mt-2">
            Build and save custom reports with your data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReportsData} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button>
            <BarChart3 className="h-4 w-4 mr-2" />
            Create New Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">In system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadData?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Lead conversion</p>
          </CardContent>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Export</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-muted-foreground">Monthly report</p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>Your custom report templates</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{report.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{report.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Last run: {report.lastRun}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {report.creator}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Run Report
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Report Categories</CardTitle>
          <CardDescription>Browse reports by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Sales Reports', count: 8, color: 'blue' },
              { name: 'Marketing Reports', count: 6, color: 'green' },
              { name: 'Analytics Reports', count: 5, color: 'purple' },
              { name: 'Financial Reports', count: 3, color: 'orange' },
              { name: 'Activity Reports', count: 2, color: 'pink' },
            ].map((category) => (
              <div
                key={category.name}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <h4 className="font-semibold">{category.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{category.count} reports</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Report Builder</CardTitle>
          <CardDescription>Create a simple report quickly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Report Name</label>
            <input
              type="text"
              placeholder="Enter report name"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Sales Report</option>
                <option>Marketing Report</option>
                <option>Analytics Report</option>
                <option>Financial Report</option>
                <option>Activity Report</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
                <option>Custom range</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Metrics to Include</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Total Leads',
                'Conversions',
                'Revenue',
                'Email Opens',
                'Click Rate',
                'Campaign ROI',
                'Lead Score',
                'Activity Count',
                'Contact Growth',
              ].map((metric) => (
                <label key={metric} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">{metric}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Group By</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>No grouping</option>
              <option>By Day</option>
              <option>By Week</option>
              <option>By Month</option>
              <option>By User</option>
              <option>By Status</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button>Generate Report</Button>
            <Button variant="outline">Save Template</Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>Automatically generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'Weekly Sales Summary',
                schedule: 'Every Monday at 8:00 AM',
                recipients: 'sales-team@company.com',
                nextRun: '2024-01-22',
              },
              {
                name: 'Monthly Performance Report',
                schedule: 'First day of month at 9:00 AM',
                recipients: 'executives@company.com',
                nextRun: '2024-02-01',
              },
            ].map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-semibold">{schedule.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{schedule.schedule}</p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                    <span>To: {schedule.recipients}</span>
                    <span>Next run: {schedule.nextRun}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Edit Schedule
                  </Button>
                  <Button variant="ghost" size="sm">
                    Pause
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Choose your preferred export format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { format: 'PDF', icon: '📄', description: 'Formatted document' },
              { format: 'Excel', icon: '📊', description: 'Spreadsheet data' },
              { format: 'CSV', icon: '📋', description: 'Raw data' },
              { format: 'JSON', icon: '{ }', description: 'API format' },
            ].map((option) => (
              <div
                key={option.format}
                className="p-4 border rounded-lg text-center cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <h4 className="font-semibold">{option.format}</h4>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReports;
