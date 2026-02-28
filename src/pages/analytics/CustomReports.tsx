import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Filter, Download, RefreshCw, Layout, Plus, Settings, X, GripVertical } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { analyticsApi, savedReportsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { exportToCSV, exportToJSON, exportAnalyticsAsPDF, ExportColumn } from '@/lib/exportService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { ReportConfig } from '@/types';

// ——— Report Builder types ———
type WidgetType = 'table' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'number-card' | 'gauge' | 'funnel' | 'area-chart';
type DataSourceType = 'leads' | 'campaigns' | 'contacts' | 'tasks';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ReportWidget {
  id: string;
  type: WidgetType;
  dataSource: DataSourceType | null;
  label: string;
  data: ChartDataPoint[] | null;
  value?: number;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

const CustomReports = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'saved' | 'builder'>('saved');

  // ——— Saved Reports state ———
  const [_showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({ name: '', type: 'leads', groupBy: 'none', metrics: [], dateRange: '30d' });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [generatedReport, setGeneratedReport] = useState<Record<string, unknown> | null>(null);

  // ——— Report Builder state ———
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [reportName, setReportName] = useState('My Custom Report');
  const [reportCategory, setReportCategory] = useState('Sales');

  // Fetch saved reports from API
  const { data: savedReportsData, refetch: refetchSaved } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => savedReportsApi.list(),
  });
  const savedReports = savedReportsData?.data || [];

  // ——— Shared analytics data (used by both tabs) ———
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));

  const { data: reportsResult, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['custom-reports'],
    queryFn: async () => {
      const params = dateRangeRef.current;
      const [dashboard, leads, campaigns] = await Promise.all([
        analyticsApi.getDashboardStats(params),
        analyticsApi.getLeadAnalytics(params),
        analyticsApi.getCampaignAnalytics(params),
      ]);
      return { dashboardData: dashboard?.data || dashboard, leadData: leads?.data || leads, campaignData: campaigns?.data || campaigns };
    },
  });

  const dashboardData = reportsResult?.dashboardData ?? null;
  const leadData = reportsResult?.leadData ?? null;
  const campaignData = reportsResult?.campaignData ?? null;

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
  };

  const deleteReport = async (id: number | string) => {
    try {
      await savedReportsApi.delete(String(id));
      refetchSaved();
      toast.success('Report deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  // ——— Report Builder helpers ———
  const dataSources = {
    leads: leadData?.total || 0,
    campaigns: campaignData?.total || 0,
    contacts: dashboardData?.overview?.totalLeads || 0,
    tasks: dashboardData?.overview?.totalTasks || dashboardData?.tasks?.total || 0,
  };

  const analyticsData = {
    leadsByStatus: [
      { name: 'New', value: leadData?.byStatus?.NEW || 0 },
      { name: 'Contacted', value: leadData?.byStatus?.CONTACTED || 0 },
      { name: 'Qualified', value: leadData?.byStatus?.QUALIFIED || 0 },
      { name: 'Won', value: leadData?.byStatus?.WON || 0 },
      { name: 'Lost', value: leadData?.byStatus?.LOST || 0 },
    ].filter(d => d.value > 0),
    leadsBySource: Object.entries(leadData?.bySource || {}).map(([name, value]) => ({
      name,
      value: value as number,
    })),
    campaignPerformance: (campaignData?.campaigns || []).slice(0, 8).map((c: Record<string, unknown>) => ({
      name: (c.name as string)?.substring(0, 15) || 'Campaign',
      sent: (c.sent as number) || 0,
      opened: (c.opened as number) || 0,
      clicked: (c.clicked as number) || 0,
    })),
    monthlyTrend: (dashboardData?.activities?.recent || []).map((m: Record<string, unknown>) => ({
      name: (m.createdAt as string)?.split('T')[0] || '',
      leads: 1,
      value: 1,
    })),
    tasksByPriority: [
      { name: 'Completed', value: dashboardData?.tasks?.completed || 0 },
      { name: 'Overdue', value: dashboardData?.tasks?.overdue || 0 },
      { name: 'Due Today', value: dashboardData?.tasks?.dueToday || 0 },
    ].filter(d => d.value > 0),
  };

  const getDataForWidget = (dataSource: DataSourceType | null, widgetType: WidgetType): { data: ChartDataPoint[]; value?: number } => {
    switch (dataSource) {
      case 'leads':
        if (widgetType === 'number-card') return { data: [], value: dataSources.leads };
        if (widgetType === 'pie-chart') return { data: analyticsData.leadsBySource };
        return { data: analyticsData.leadsByStatus };
      case 'campaigns':
        if (widgetType === 'number-card') return { data: [], value: dataSources.campaigns };
        return { data: analyticsData.campaignPerformance };
      case 'contacts':
        if (widgetType === 'number-card') return { data: [], value: dataSources.contacts };
        return { data: analyticsData.monthlyTrend };
      case 'tasks':
        if (widgetType === 'number-card') return { data: [], value: dataSources.tasks };
        if (widgetType === 'pie-chart') return { data: analyticsData.tasksByPriority };
        return { data: analyticsData.tasksByPriority };
      default:
        return { data: analyticsData.monthlyTrend, value: 0 };
    }
  };

  const refreshWidgetData = (widget: ReportWidget): ReportWidget => {
    const { data, value } = getDataForWidget(widget.dataSource, widget.type);
    return { ...widget, data, value };
  };

  useEffect(() => {
    if (reportsResult) {
      setWidgets(prev => prev.map(w => refreshWidgetData(w)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsResult]);

  const handleWidgetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;
    try {
      const dropped = JSON.parse(rawData);
      const newWidget: ReportWidget = {
        id: `widget-${Date.now()}`,
        type: dropped.type as WidgetType,
        dataSource: dropped.dataSource || null,
        label: dropped.label || dropped.name || 'Widget',
        data: null,
        value: undefined,
      };
      const { data, value } = getDataForWidget(newWidget.dataSource, newWidget.type);
      newWidget.data = data;
      newWidget.value = value;
      setWidgets(prev => [...prev, newWidget]);
    } catch (err) {
      console.error('Drop parse error:', err);
    }
  };

  const handleSourceDragStart = (e: React.DragEvent, source: { name: string; key: string }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'bar-chart',
      dataSource: source.key,
      label: `${source.name} Overview`,
    }));
  };

  const handleSourceDrop = (sourceKey: string) => {
    const sourceName = sourceKey.charAt(0).toUpperCase() + sourceKey.slice(1);
    const newWidget: ReportWidget = {
      id: `widget-${Date.now()}`,
      type: 'bar-chart' as WidgetType,
      dataSource: sourceKey as DataSourceType,
      label: `${sourceName} Overview`,
      data: null,
      value: undefined,
    };
    const { data, value } = getDataForWidget(newWidget.dataSource, newWidget.type);
    newWidget.data = data;
    newWidget.value = value;
    setWidgets(prev => [...prev, newWidget]);
    toast.success(`Added ${sourceName} widget to report`);
  };

  const handleWidgetDragStart = (e: React.DragEvent, widget: { name: string; type: string }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: widget.type,
      dataSource: null,
      label: widget.name,
    }));
  };

  const handleWidgetAdd = (widgetType: string, widgetName: string) => {
    const newWidget: ReportWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType as WidgetType,
      dataSource: null,
      label: widgetName,
      data: null,
      value: undefined,
    };
    setWidgets(prev => [...prev, newWidget]);
    toast.success(`Added ${widgetName} widget to report`);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const assignDataSource = (widgetId: string, dataSource: DataSourceType) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== widgetId) return w;
      const { data, value } = getDataForWidget(dataSource, w.type);
      return { ...w, dataSource, data, value };
    }));
  };

  const renderWidget = (widget: ReportWidget) => {
    const chartData = widget.data || [];
    const isEmpty = chartData.length === 0 && !widget.value;

    if (isEmpty && widget.type !== 'number-card') {
      return (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center">
            <p>No data available</p>
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {(['leads', 'campaigns', 'contacts', 'tasks'] as DataSourceType[]).map(ds => (
                <button
                  key={ds}
                  className="text-xs px-2 py-1 border rounded hover:bg-accent capitalize"
                  onClick={() => assignDataSource(widget.id, ds)}
                >
                  {ds}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    switch (widget.type) {
      case 'number-card':
        return (
          <div className="h-32 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold">{(widget.value ?? 0).toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{widget.dataSource || 'Total'}</p>
          </div>
        );
      case 'bar-chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              {chartData[0]?.sent !== undefined && <Bar dataKey="sent" fill="#3B82F6" />}
              {chartData[0]?.opened !== undefined && <Bar dataKey="opened" fill="#10B981" />}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line-chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey={chartData[0]?.leads !== undefined ? 'leads' : 'value'} stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie-chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {chartData.map((_: ChartDataPoint, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area-chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey={chartData[0]?.leads !== undefined ? 'leads' : 'value'} fill="#3B82F6" fillOpacity={0.2} stroke="#3B82F6" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'gauge': {
        const gaugeValue = widget.value || (chartData[0]?.value ?? 0);
        return (
          <div className="h-32 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="8"
                  strokeDasharray={`${(gaugeValue / 100) * 251} 251`}
                  strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{gaugeValue}%</div>
            </div>
          </div>
        );
      }
      case 'table':
        return (
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs">
              <thead><tr className="border-b">{Object.keys(chartData[0] || {}).map(k => <th key={k} className="text-left p-1 font-medium">{k}</th>)}</tr></thead>
              <tbody>
                {chartData.slice(0, 10).map((row: ChartDataPoint, i: number) => (
                  <tr key={i} className="border-b">{Object.values(row).map((v: string | number, j: number) => <td key={j} className="p-1">{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'funnel': {
        const maxFunnel = Math.max(...chartData.map((d: ChartDataPoint) => d.value || 0), 1);
        return (
          <div className="space-y-1 py-2">
            {chartData.map((d: ChartDataPoint, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-16 truncate">{d.name}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(d.value / maxFunnel) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <span className="text-xs w-8 text-right">{d.value}</span>
              </div>
            ))}
          </div>
        );
      }
      default:
        return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Unsupported widget type</div>;
    }
  };

  const handleBuilderExport = () => {
    const reportData = { name: reportName, category: reportCategory, widgets: widgets.map(w => ({ type: w.type, dataSource: w.dataSource, label: w.label })) };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ——————————————————————————————————————————
  // RENDER
  // ——————————————————————————————————————————
  return (
    <div className="space-y-6">
      {isError && (
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load report data'} retry={() => refetch()} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground mt-2">
            Build, save, and manage custom reports with your data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'saved'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('saved')}
        >
          Saved Reports
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'builder'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('builder')}
        >
          Report Builder
        </button>
      </div>

      {loading && !dashboardData && (
        <LoadingSkeleton rows={4} showChart={true} />
      )}

      {/* ════════════════════════════════════════════
          TAB 1 — Saved Reports
          ════════════════════════════════════════════ */}
      {activeTab === 'saved' && (
        <>
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
                  <Button size="sm" onClick={() => setActiveTab('builder')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedReports.length > 0 ? savedReports.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{report.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary">{(report as any).type || 'leads'}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated: {new Date((report as any).updatedAt || (report as any).lastRun || '').toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            by {(report as any).user?.firstName ? `${(report as any).user.firstName} ${(report as any).user.lastName}` : (report as any).creator || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        const config = (report as any).config || {};
                        const results: Record<string, unknown> = { name: report.name, type: config.type || report.type, generatedAt: new Date().toISOString() };
                        if (config.type === 'leads' || report.type === 'leads') {
                          results.totalLeads = leadData?.total || 0;
                          results.conversionRate = leadData?.conversionRate || 0;
                          results.byStatus = leadData?.byStatus || {};
                          results.bySource = leadData?.bySource || {};
                        } else if (config.type === 'campaigns' || report.type === 'campaigns') {
                          results.totalCampaigns = campaignData?.total || 0;
                          results.performance = campaignData?.performance || {};
                        }
                        setGeneratedReport(results);
                        toast.success(`Running report: ${report.name}`);
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
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                    <p>No saved reports yet.</p>
                    <Button variant="link" size="sm" onClick={() => setActiveTab('builder')}>
                      Open the Report Builder to create one
                    </Button>
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
          <Card id="report-builder">
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
                    'Total Leads', 'Conversions', 'Revenue', 'Email Opens',
                    'Click Rate', 'Campaign ROI', 'Lead Score', 'Activity Count', 'Contact Growth',
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
                  if (!reportConfig.name?.trim()) { toast.error('Please enter a report name'); return; }
                  const results: Record<string, unknown> = { name: reportConfig.name, type: reportConfig.type, generatedAt: new Date().toISOString() };
                  if (reportConfig.type === 'leads') {
                    results.totalLeads = leadData?.total || 0;
                    results.conversionRate = leadData?.conversionRate || 0;
                    results.byStatus = leadData?.byStatus || {};
                    results.bySource = leadData?.bySource || {};
                  } else if (reportConfig.type === 'campaigns') {
                    results.totalCampaigns = campaignData?.total || 0;
                    results.performance = campaignData?.performance || {};
                  }
                  if (reportConfig.groupBy === 'status' && leadData?.byStatus) {
                    results.groupedData = Object.entries(leadData.byStatus).map(([k, v]) => ({ group: k, count: v }));
                  }
                  setGeneratedReport(results);
                  toast.success(`Report "${reportConfig.name}" generated`);
                }}>Generate Report</Button>
                <Button variant="outline" onClick={async () => {
                  if (!reportConfig.name?.trim()) { toast.error('Please enter a report name'); return; }
                  try {
                    await savedReportsApi.create({
                      name: reportConfig.name || 'Untitled Report',
                      description: `Custom ${reportConfig.type} report`,
                      type: reportConfig.type,
                      config: { type: reportConfig.type, groupBy: reportConfig.groupBy, metrics: reportConfig.metrics, dateRange: reportConfig.dateRange },
                    });
                    refetchSaved();
                    toast.success('Report template saved');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to save report');
                  }
                }}>Save Template</Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Report Results */}
          {generatedReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Report Results: {generatedReport.name as string}</CardTitle>
                    <CardDescription>Generated {new Date(generatedReport.generatedAt as string).toLocaleString()}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setGeneratedReport(null)}>Dismiss</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {generatedReport.totalLeads !== undefined && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Leads</div>
                        <div className="text-2xl font-bold">{generatedReport.totalLeads as number}</div>
                      </CardContent>
                    </Card>
                  )}
                  {generatedReport.conversionRate !== undefined && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Conversion Rate</div>
                        <div className="text-2xl font-bold">{generatedReport.conversionRate as number}%</div>
                      </CardContent>
                    </Card>
                  )}
                  {generatedReport.totalCampaigns !== undefined && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Campaigns</div>
                        <div className="text-2xl font-bold">{generatedReport.totalCampaigns as number}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {!!generatedReport.byStatus && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">By Status</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {(Object.entries(generatedReport.byStatus as Record<string, number>) as [string, number][]).map(([status, count]) => (
                        <div key={status} className="p-2 border rounded text-center">
                          <div className="text-xs text-muted-foreground">{status}</div>
                          <div className="font-bold">{String(count)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!generatedReport.bySource && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">By Source</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(Object.entries(generatedReport.bySource as Record<string, number>) as [string, number][]).map(([source, count]) => (
                        <div key={source} className="p-2 border rounded text-center">
                          <div className="text-xs text-muted-foreground">{source}</div>
                          <div className="font-bold">{String(count)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scheduled Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automatically generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Weekly Sales Summary', schedule: 'Every Monday at 8:00 AM', recipients: 'sales-team@company.com', nextRun: '2024-01-22' },
                  { name: 'Monthly Performance Report', schedule: 'First day of month at 9:00 AM', recipients: 'executives@company.com', nextRun: '2024-02-01' },
                ].map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{schedule.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{schedule.schedule}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>To: {schedule.recipients}</span>
                        <span>Next run: {schedule.nextRun}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowReportBuilder(true);
                        setReportConfig(prev => ({ ...prev, name: schedule.name }));
                        setTimeout(() => document.getElementById('report-builder')?.scrollIntoView({ behavior: 'smooth' }), 100);
                        toast.info(`Editing schedule: ${schedule.name} — update via the Report Builder below`);
                      }}>
                        Edit Schedule
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`${schedule.name} paused`)}>
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
                      const sections: { label: string; value: string | number }[] = [
                        { label: 'Total Leads', value: leadData?.total || 0 },
                        { label: 'Conversion Rate', value: `${leadData?.conversionRate || 0}%` },
                        { label: 'Total Campaigns', value: campaignData?.total || 0 },
                      ];
                      if (leadData?.byStatus) {
                        Object.entries(leadData.byStatus).forEach(([status, count]) => {
                          sections.push({ label: `Leads - ${status}`, value: count as number });
                        });
                      }
                      if (option.format === 'PDF') {
                        exportAnalyticsAsPDF('Custom Report', sections);
                      } else if (option.format === 'CSV' || option.format === 'Excel') {
                        const columns: ExportColumn<{ label: string; value: string | number }>[] = [
                          { header: 'Metric', accessor: 'label' },
                          { header: 'Value', accessor: 'value' },
                        ];
                        exportToCSV(sections, columns, { filename: 'custom-report' });
                      } else if (option.format === 'JSON') {
                        const columns: ExportColumn<{ label: string; value: string | number }>[] = [
                          { header: 'Metric', accessor: 'label' },
                          { header: 'Value', accessor: 'value' },
                        ];
                        exportToJSON(sections, columns, { filename: 'custom-report', format: 'json' });
                      }
                      toast.success(`Exported as ${option.format}`);
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
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 2 — Report Builder (drag-and-drop)
          ════════════════════════════════════════════ */}
      {activeTab === 'builder' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Drag data sources or widgets onto the canvas to build visual reports
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleBuilderExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={async () => {
                if (!reportName.trim()) { toast.error('Please enter a report name'); return; }
                try {
                  await savedReportsApi.create({
                    name: reportName,
                    type: reportCategory,
                    config: {
                      widgets: widgets.map(w => ({ type: w.type, dataSource: w.dataSource, label: w.label })),
                      createdAt: new Date().toISOString(),
                    },
                  });
                  refetchSaved();
                  toast.success(`Report "${reportName}" saved successfully`);
                } catch {
                  toast.error('Failed to save report. Please try again.');
                }
              }}>Save Report</Button>
            </div>
          </div>

          {loading && widgets.length === 0 && (
            <div className="space-y-4">
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
              <div className="grid gap-6 md:grid-cols-4">
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
                <div className="md:col-span-3 h-48 bg-muted animate-pulse rounded-lg" />
              </div>
            </div>
          )}

          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Set up your report basics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Report Name</label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Report Category</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Analytics</option>
                    <option>Financial</option>
                    <option>Custom</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Data Sources */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Data Sources</CardTitle>
                <CardDescription>Drag or click + to add to canvas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'Leads', icon: TrendingUp, count: dataSources.leads, key: 'leads' },
                    { name: 'Campaigns', icon: BarChart3, count: dataSources.campaigns, key: 'campaigns' },
                    { name: 'Contacts', icon: Layout, count: dataSources.contacts, key: 'contacts' },
                    { name: 'Tasks', icon: Settings, count: dataSources.tasks, key: 'tasks' },
                  ].map((source) => (
                    <div
                      key={source.name}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-grab hover:border-primary transition-colors active:cursor-grabbing"
                      draggable
                      tabIndex={0}
                      role="button"
                      aria-label={`Add ${source.name} widget to report`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSourceDrop(source.key); } }}
                      onDragStart={(e) => handleSourceDragStart(e, source)}
                    >
                      <div className="flex items-center space-x-2">
                        <source.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{source.count}</span>
                        <button
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSourceDrop(source.key); }}
                          aria-label={`Add ${source.name} to report`}
                          title={`Add ${source.name}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Canvas */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Report Canvas</CardTitle>
                <CardDescription>{widgets.length} widget{widgets.length !== 1 ? 's' : ''} added</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 min-h-[400px] transition-colors ${
                    isDraggingOver ? 'border-primary bg-primary/5' : 'bg-muted/20'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleWidgetDrop}
                >
                  {widgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[360px] text-center">
                      <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Start Building Your Report</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Drag data sources or widgets from the sidebar to create your custom report layout
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {widgets.map((widget) => (
                        <Card key={widget.id} className="relative group">
                          <CardHeader className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <CardTitle className="text-sm">{widget.label}</CardTitle>
                              </div>
                              <div className="flex items-center gap-1">
                                {widget.dataSource && (
                                  <Badge variant="secondary" className="text-xs">{widget.dataSource}</Badge>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeWidget(widget.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2 px-4">
                            {renderWidget(widget)}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Widgets Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Available Widgets</CardTitle>
              <CardDescription>Drag widgets to add visualizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                {[
                  { name: 'Table', icon: '📊', type: 'table' },
                  { name: 'Bar Chart', icon: '📊', type: 'bar-chart' },
                  { name: 'Line Chart', icon: '📈', type: 'line-chart' },
                  { name: 'Pie Chart', icon: '🥧', type: 'pie-chart' },
                  { name: 'Number Card', icon: '🔢', type: 'number-card' },
                  { name: 'Gauge', icon: '⏱️', type: 'gauge' },
                  { name: 'Funnel', icon: '🔻', type: 'funnel' },
                  { name: 'Area Chart', icon: '📉', type: 'area-chart' },
                ].map((widget) => (
                  <div
                    key={widget.name}
                    className="p-4 border rounded-lg text-center cursor-grab hover:border-primary transition-colors active:cursor-grabbing"
                    draggable
                    tabIndex={0}
                    role="button"
                    aria-label={`Add ${widget.name} widget to report`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWidgetAdd(widget.type, widget.name); } }}
                    onDragStart={(e) => handleWidgetDragStart(e, widget)}
                  >
                    <div className="text-3xl mb-2">{widget.icon}</div>
                    <p className="text-xs font-medium">{widget.name}</p>
                    <button
                      className="mt-2 text-xs px-2 py-1 border rounded hover:bg-accent transition-colors"
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleWidgetAdd(widget.type, widget.name); }}
                      aria-label={`Add ${widget.name}`}
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomReports;
