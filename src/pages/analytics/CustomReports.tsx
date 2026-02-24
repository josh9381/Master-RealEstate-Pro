import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import type { ReportConfig, SavedReport } from '@/types';

const CustomReports = () => {
  const { toast } = useToast();

  const [_showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({ name: '', type: 'leads', groupBy: 'none', metrics: [], dateRange: '30d' });
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Persist saved reports in localStorage
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => {
    try {
      const stored = localStorage.getItem('customReports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const { data: reportsResult, isLoading: loading, refetch } = useQuery({
    queryKey: ['custom-reports'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const [dashboard, leads, campaigns] = await Promise.all([
        analyticsApi.getDashboardStats(params).catch((e: Error) => { console.error('Dashboard stats failed:', e); return null; }),
        analyticsApi.getLeadAnalytics(params).catch((e: Error) => { console.error('Lead analytics failed:', e); return null; }),
        analyticsApi.getCampaignAnalytics(params).catch((e: Error) => { console.error('Campaign analytics failed:', e); return null; }),
      ]);
      return { dashboardData: dashboard, leadData: leads, campaignData: campaigns };
    },
  });

  const dashboardData = reportsResult?.dashboardData ?? null;
  const leadData = reportsResult?.leadData ?? null;
  const campaignData = reportsResult?.campaignData ?? null;

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  const deleteReport = (id: number) => {
    const updated = savedReports.filter((r) => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('customReports', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground mt-2">
            Build and save custom reports with your data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button onClick={() => {
            setShowReportBuilder(true);
            // Scroll to report builder
            setTimeout(() => document.getElementById('report-builder')?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Create New Report
          </Button>
        </div>
      </div>

      {loading && !dashboardData && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      )}

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
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Export</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.stats?.lastExport || '—'}</div>
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
              <Button variant="outline" size="sm" onClick={() => {
                const next = filterCategory === 'all' ? 'Sales Reports' : filterCategory === 'Sales Reports' ? 'Marketing Reports' : 'all';
                setFilterCategory(next);
                toast.info(next === 'all' ? 'Showing all reports' : `Filtered: ${next}`);
              }}>
                <Filter className="h-4 w-4 mr-2" />
                {filterCategory === 'all' ? 'Filter' : filterCategory}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedReports.length > 0 ? savedReports.map((report) => (
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
                  <Button variant="outline" size="sm" onClick={() => {
                    toast.info(`Running report: ${report.name}`);
                  }}>
                    Run Report
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    toast.info(`Editing report: ${report.name}`);
                  }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteReport(report.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                No saved reports yet. Create one using the Quick Report Builder below.
              </div>
            )}
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
                className={`p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${filterCategory === category.name ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => {
                  setFilterCategory(category.name);
                  setReportConfig((prev) => ({ ...prev, type: category.name.split(' ')[0].toLowerCase() }));
                  toast.info(`Category: ${category.name}`);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterCategory(category.name); } }}
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
              value={reportConfig.name}
              onChange={(e) => setReportConfig((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={reportConfig.type} onChange={(e) => setReportConfig((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="sales">Sales Report</option>
                <option value="marketing">Marketing Report</option>
                <option value="analytics">Analytics Report</option>
                <option value="financial">Financial Report</option>
                <option value="activity">Activity Report</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={reportConfig.dateRange} onChange={(e) => setReportConfig((prev) => ({ ...prev, dateRange: e.target.value }))}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">This year</option>
                <option value="custom">Custom range</option>
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
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={reportConfig.metrics?.includes(metric) || false}
                    onChange={(e) => {
                      setReportConfig((prev) => ({
                        ...prev,
                        metrics: e.target.checked
                          ? [...(prev.metrics || []), metric]
                          : (prev.metrics || []).filter((m: string) => m !== metric)
                      }));
                    }}
                  />
                  <span className="text-sm">{metric}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Group By</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={reportConfig.groupBy} onChange={(e) => setReportConfig((prev) => ({ ...prev, groupBy: e.target.value }))}>
              <option value="none">No grouping</option>
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
              <option value="user">By User</option>
              <option value="status">By Status</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => {
              if (!reportConfig.name?.trim()) {
                toast.error('Please enter a report name');
                return;
              }
              toast.success(`Report "${reportConfig.name}" generated`);
            }}>Generate Report</Button>
            <Button variant="outline" onClick={() => {
              if (!reportConfig.name?.trim()) {
                toast.error('Please enter a report name');
                return;
              }
              const report = {
                id: Date.now(),
                name: reportConfig.name || 'Untitled Report',
                description: `Custom ${reportConfig.type} report`,
                type: reportConfig.type,
                lastRun: new Date().toISOString().split('T')[0],
                creator: 'Current User'
              };
              const updated = [...savedReports, report];
              setSavedReports(updated);
              localStorage.setItem('customReports', JSON.stringify(updated));
              toast.success('Report template saved');
            }}>Save Template</Button>
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
                  <Button variant="outline" size="sm" onClick={() => toast.info(`Edit schedule: ${schedule.name}`)}>
                    Edit Schedule
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toast.info(`Paused: ${schedule.name}`)}>
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
                onClick={() => {
                  toast.success(`Exporting as ${option.format}...`);
                  // In production, trigger actual file download
                }}
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
