import { Layout, Plus, Settings, TrendingUp, BarChart3, RefreshCw, X, Download, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, savedReportsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { DateRangePicker, DateRange, computeDateRange } from '@/components/shared/DateRangePicker';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

const ReportBuilder = () => {
  const { toast } = useToast();
  const dateRangeRef = useRef<DateRange>(computeDateRange('30d'));
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [reportName, setReportName] = useState('My Custom Report');
  const [reportCategory, setReportCategory] = useState('Sales');

  const { data: builderResult, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['report-builder'],
    queryFn: async () => {
      const dateParams = dateRangeRef.current;
      const [dashboardData, leadData, campaignData] = await Promise.all([
        analyticsApi.getDashboardStats(dateParams),
        analyticsApi.getLeadAnalytics(dateParams),
        analyticsApi.getCampaignAnalytics(dateParams),
      ]);
      return { dashboardData: dashboardData?.data || dashboardData, leadData: leadData?.data || leadData, campaignData: campaignData?.data || campaignData };
    },
  });

  const dashboardData = builderResult?.dashboardData ?? null;
  const leadData = builderResult?.leadData ?? null;
  const campaignData = builderResult?.campaignData ?? null;

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

  // Refresh widget data when analytics data changes
  useEffect(() => {
    if (builderResult) {
      setWidgets(prev => prev.map(w => refreshWidgetData(w)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderResult]);

  const handleDateChange = (range: DateRange) => {
    dateRangeRef.current = range;
    refetch();
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

      // Auto-assign data
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

  // Keyboard-accessible alternative to drag-and-drop
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

  // Keyboard-accessible alternative for widget palette
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
      case 'gauge':
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
      case 'funnel':
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
      default:
        return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Unsupported widget type</div>;
    }
  };

  const handleExport = () => {
    const reportData = { name: reportName, category: reportCategory, widgets: widgets.map(w => ({ type: w.type, dataSource: w.dataSource, label: w.label })) };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {isError && (
        <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load report data'} retry={() => refetch()} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create custom reports with drag-and-drop interface
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker onChange={handleDateChange} />
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={async () => {
            if (!reportName.trim()) {
              toast.error('Please enter a report name')
              return
            }
            try {
              await savedReportsApi.create({
                name: reportName,
                type: reportCategory,
                config: {
                  widgets: widgets.map(w => ({ type: w.type, dataSource: w.dataSource, label: w.label })),
                  createdAt: new Date().toISOString(),
                },
              })
              toast.success(`Report "${reportName}" saved successfully`)
            } catch (error) {
              toast.error('Failed to save report. Please try again.')
            }
          }}>Save Report</Button>
        </div>
      </div>

      {isLoading && widgets.length === 0 && (
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSourceDrop(source.key);
                    }
                  }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleWidgetAdd(widget.type, widget.name);
                  }
                }}
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
    </div>
  );
};

export default ReportBuilder;
