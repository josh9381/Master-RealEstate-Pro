import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Mail, MousePointer, RefreshCw, Download, Send, Eye, DollarSign, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { campaignsApi, analyticsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState';
import { DateRangePicker, DateRange, DateRangePreset, computeDateRange } from '@/components/shared/DateRangePicker';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { exportToCSV, campaignExportColumns } from '@/lib/exportService';
import { calcOpenRate, calcClickRate, calcConversionRate, calcDeliveryRate, calcBounceRate, calcUnsubscribeRate, calcROI, formatRate, fmtMoney } from '@/lib/metricsCalculator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { Campaign, EnrichedCampaign } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const TYPE_DISPLAY: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PHONE: 'Phone',
  SOCIAL: 'Social',
};

/** Benchmark constants for real estate industry */
const BENCHMARKS = {
  openRate: 22.5,   // 20-25% industry average
  clickRate: 3.5,   // 2-5% target
  conversionRate: 1.5,
};

/** Color a rate relative to its benchmark */
function benchmarkColor(rate: number, benchmark: number): string {
  if (rate >= benchmark * 1.1) return 'text-green-600';
  if (rate >= benchmark * 0.9) return 'text-foreground';
  return 'text-red-600';
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface AnalyticsPerformance {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  totalRevenue: number;
  totalSpent: number;
  averageROI: number;
}

interface TopCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  roi: number;
  spent: number;
}

interface MonthlyDataPoint {
  month: string;
  date?: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

interface HourlyDataPoint {
  hour: number;
  label: string;
  opens: number;
  clicks: number;
  total: number;
}

const ITEMS_PER_PAGE = 10;

// ─── Shared Reusable Components ───────────────────────────────────────────────

interface MetricCardProps {
  title: string | ReactNode;
  icon: LucideIcon;
  value: string;
  subtitle: string;
  valueClassName?: string;
}

function MetricCard({ title, icon: Icon, value, subtitle, valueClassName }: MetricCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

interface ReportToolbarProps {
  datePreset: DateRangePreset;
  onDateChange: (range: DateRange, preset: DateRangePreset) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
  exportLabel?: string;
}

function ReportToolbar({ datePreset, onDateChange, onRefresh, onExport, isRefreshing, exportLabel = 'Export Data' }: ReportToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <DateRangePicker value={datePreset} onChange={onDateChange} />
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm" onClick={onExport}>
        <Download className="h-4 w-4 mr-2" />
        {exportLabel}
      </Button>
    </div>
  );
}

interface TrendLineConfig {
  dataKey: string;
  stroke: string;
  name?: string;
}

interface PerformanceTrendChartProps {
  title: string;
  description: string;
  data: Record<string, unknown>[];
  lines: TrendLineConfig[];
  height?: number;
  emptyMessage?: string;
}

function PerformanceTrendChart({ title, description, data, lines, height = 350, emptyMessage = 'No performance data yet' }: PerformanceTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {lines.map((line) => (
                <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} stroke={line.stroke} strokeWidth={2} name={line.name} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={`flex items-center justify-center text-muted-foreground`} style={{ height }}>
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NoEngagementStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

function NoEngagementState({ icon: Icon, title, message }: NoEngagementStateProps) {
  return (
    <Card className="py-6">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <Icon className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </CardContent>
    </Card>
  );
}

interface LeaderboardCardProps {
  title: string;
  description: string;
  indicatorColor: string;
  items: { id: string; name: string; type: string; sent: number; opened: number; clicked: number }[];
  rateCalc: (item: { sent: number; opened: number; clicked: number }) => number;
  valueColor: string;
  emptyMessage?: string;
  onItemClick: (id: string) => void;
}

function LeaderboardCard({ title, description, indicatorColor, items, rateCalc, valueColor, emptyMessage = 'No campaigns found', onItemClick }: LeaderboardCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className={`inline-block h-3 w-3 rounded-full ${indicatorColor}`} title={`${title} indicator`} />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => onItemClick(item.id)}>
              <div>
                <p className="font-medium">{item.name}</p>
                <Badge variant="secondary" className="mt-1">{item.type}</Badge>
              </div>
              <span className={`text-2xl font-bold ${valueColor}`}>
                {formatRate(rateCalc(item))}%
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-4">{emptyMessage}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCellProps {
  label: string;
  value: string | number;
  rate?: string;
  rateColor?: string;
  large?: boolean;
  colSpan?: number;
}

function StatCell({ label, value, rate, rateColor, large = true, colSpan }: StatCellProps) {
  return (
    <div className={colSpan ? `col-span-${colSpan}` : undefined}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={large ? 'text-2xl font-bold' : 'text-lg font-semibold'}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {rate && <p className={`text-xs ${rateColor ?? 'text-muted-foreground'}`}>{rate}</p>}
    </div>
  );
}

function CampaignDetailCard({ campaign, onNavigate }: { campaign: EnrichedCampaign; onNavigate: (id: string) => void }) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md hover:border-primary/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{campaign.name}</h4>
            <Badge variant="secondary">{campaign.type}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate(campaign.id)}>
          View Full Report
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCell label="Sent" value={campaign.sent ?? 0} />
        <StatCell label="Delivered" value={campaign.delivered ?? 0} rate={`${formatRate(calcDeliveryRate(campaign.delivered ?? 0, campaign.sent))}%`} rateColor="text-green-600" />
        <StatCell label="Opened" value={campaign.opened ?? 0} rate={`${formatRate(calcOpenRate(campaign.opened ?? 0, campaign.sent))}%`} rateColor="text-blue-600" />
        <StatCell label="Clicked" value={campaign.clicked ?? 0} rate={`${formatRate(calcClickRate(campaign.clicked ?? 0, campaign.sent))}%`} rateColor="text-purple-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
        <StatCell label="Bounced" value={campaign.bounced ?? 0} rate={`${formatRate(calcBounceRate(campaign.bounced ?? 0, campaign.sent))}%`} rateColor="text-red-600" large={false} />
        <StatCell label="Unsubscribed" value={campaign.unsubscribed ?? 0} rate={`${formatRate(calcUnsubscribeRate(campaign.unsubscribed ?? 0, campaign.sent), 2)}%`} large={false} />
        <StatCell label="Revenue Generated" value={fmtMoney(campaign.revenue ?? 0)} large={false} colSpan={2} />
      </div>
    </div>
  );
}

interface FunnelStageData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

function FunnelBar({ stage, count, percentage, color }: FunnelStageData) {
  const widthPct = count > 0 ? Math.max(Math.min(percentage, 100), 2) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${color}`} />
          <span className="font-medium">{stage}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {count.toLocaleString()} ({formatRate(percentage, 1)}%)
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-4">
        <div className={`h-4 rounded-full ${color}`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

interface PaginationControlsProps {
  totalItems: number;
  page: number;
  totalPages: number;
  showAll: boolean;
  onToggleShowAll: () => void;
  onPageChange: (page: number) => void;
}

function PaginationControls({ totalItems, page, totalPages, showAll, onToggleShowAll, onPageChange }: PaginationControlsProps) {
  if (totalItems <= ITEMS_PER_PAGE) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <Button variant="outline" size="sm" onClick={onToggleShowAll}>
        {showAll ? 'Show paginated' : `Show all ${totalItems}`}
      </Button>
      {!showAll && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function TabButton({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${id}`}
      id={`tab-${id}`}
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreset = (searchParams.get('range') as DateRangePreset) || '30d';
  const [dateRange, setDateRange] = useState<DateRange>(computeDateRange(initialPreset));
  const navigate = useNavigate();

  const { data: campaignData = null, isLoading: loading, isError: campaignError, error: campaignErrorObj, refetch } = useQuery({
    queryKey: ['campaign-analytics', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const [campaignResult, monthlyResult, hourlyResult] = await Promise.allSettled([
        analyticsApi.getCampaignAnalytics(dateRange),
        analyticsApi.getMonthlyPerformance({ months: 12 }),
        analyticsApi.getHourlyEngagement({ days: 90 }),
      ]);
      const campaignResponse = campaignResult.status === 'fulfilled' ? campaignResult.value : null;
      const monthlyResponse = monthlyResult.status === 'fulfilled' ? monthlyResult.value : null;
      const hourlyResponse = hourlyResult.status === 'fulfilled' ? hourlyResult.value : null;
      return {
        ...(campaignResponse?.data || {}),
        dailyStats: monthlyResponse?.data || [],
        hourlyStats: hourlyResponse?.data?.hourly || [],
      };
    },
  });

  // Fetch all campaigns only as fallback when analytics has no topCampaigns
  const { data: allCampaignsData } = useQuery({
    queryKey: ['campaigns-for-reports'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ limit: 1000 });
      return response.data?.campaigns || [];
    },
    enabled: !loading && (!campaignData?.topCampaigns || campaignData.topCampaigns.length === 0),
  });

  const handleDateChange = (range: DateRange, preset: DateRangePreset) => {
    setDateRange(range);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('range', preset);
      return next;
    });
  };

  if (loading) {
    return <LoadingSkeleton rows={4} showChart />;
  }

  if (campaignError) {
    return (
      <ErrorBanner
        message={campaignErrorObj instanceof Error ? campaignErrorObj.message : 'Failed to load campaign analytics'}
        retry={() => refetch()}
      />
    );
  }

  const performance: AnalyticsPerformance = campaignData?.performance || {} as AnalyticsPerformance;
  const totalCampaigns: number = campaignData?.total ?? 0;
  const topCampaigns: TopCampaign[] = campaignData?.topCampaigns || [];
  const campaigns: TopCampaign[] = topCampaigns.length > 0 ? topCampaigns : (allCampaignsData || []);

  const campaignPerformance = (campaignData?.dailyStats || []).map((d: MonthlyDataPoint) => ({
    date: d.month || d.date,
    sent: d.sent ?? 0,
    opened: d.opened ?? 0,
    clicked: d.clicked ?? 0,
    converted: d.converted ?? 0,
  }));

  // Fix #1: compute actual open rate per hour (% share of total opens) instead of raw counts
  const hourlyStats: HourlyDataPoint[] = campaignData?.hourlyStats || [];
  const totalHourlyOpens = hourlyStats.reduce((sum: number, h: HourlyDataPoint) => sum + (h.opens ?? 0), 0);
  const hourlyPerformance = hourlyStats.map((h: HourlyDataPoint) => ({
    hour: h.label || String(h.hour),
    openRate: totalHourlyOpens > 0 ? Math.round(((h.opens ?? 0) / totalHourlyOpens) * 1000) / 10 : 0,
    clicks: h.clicks ?? 0,
  }));

  const hasEngagement = (performance.totalOpened ?? 0) > 0 || (performance.totalClicked ?? 0) > 0;

  return (
    <div className="space-y-6">
      <ReportToolbar
        datePreset={initialPreset}
        onDateChange={handleDateChange}
        onRefresh={() => refetch()}
        onExport={() => {
          if (campaigns.length === 0) {
            toast.error('No campaign data to export');
            return;
          }
          exportToCSV(campaigns, campaignExportColumns, { filename: `campaign-analytics-${new Date().toISOString().split('T')[0]}` });
          toast.success('Analytics exported successfully');
        }}
      />

      {/* Key Metrics — 5 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Sent"
          icon={Send}
          value={(performance.totalSent ?? 0).toLocaleString()}
          subtitle={`${totalCampaigns} campaigns`}
        />
        <MetricCard
          title={<>Open Rate<HelpTooltip text="Percentage of sent emails that were opened. Industry average is 20–25% for real estate." /></>}
          icon={Eye}
          value={`${performance.openRate ?? 0}%`}
          valueClassName={benchmarkColor(performance.openRate ?? 0, BENCHMARKS.openRate)}
          subtitle={`${(performance.totalOpened ?? 0).toLocaleString()} opened${(performance.openRate ?? 0) >= BENCHMARKS.openRate ? ' · Above avg' : ' · Below avg'}`}
        />
        <MetricCard
          title={<>Click Rate<HelpTooltip text="Percentage of sent emails where a link was clicked. A good click rate is 2–5%." /></>}
          icon={MousePointer}
          value={`${performance.clickRate ?? 0}%`}
          valueClassName={benchmarkColor(performance.clickRate ?? 0, BENCHMARKS.clickRate)}
          subtitle={`${(performance.totalClicked ?? 0).toLocaleString()} clicked${(performance.clickRate ?? 0) >= BENCHMARKS.clickRate ? ' · Above avg' : ' · Below avg'}`}
        />
        <MetricCard
          title="Conversion Rate"
          icon={Users}
          value={`${performance.conversionRate ?? 0}%`}
          subtitle={`${(performance.totalConverted ?? 0).toLocaleString()} converted`}
        />
        <MetricCard
          title="Revenue"
          icon={DollarSign}
          value={fmtMoney(performance.totalRevenue ?? 0)}
          subtitle={`Avg ROI: ${performance.averageROI ?? 0}%`}
        />
      </div>

      {totalCampaigns === 0 && <AnalyticsEmptyState variant="campaigns" />}

      {totalCampaigns > 0 && !hasEngagement && (
        <NoEngagementState
          icon={Eye}
          title="No engagement data yet"
          message="Your campaigns have been sent but no opens or clicks have been recorded yet. Check back soon!"
        />
      )}

      {/* Performance Trend */}
      <PerformanceTrendChart
        title="Campaign Performance Trend"
        description="Sent, opened, clicked, and converted over time"
        data={campaignPerformance}
        lines={[
          { dataKey: 'sent', stroke: '#8b5cf6' },
          { dataKey: 'opened', stroke: '#3b82f6' },
          { dataKey: 'clicked', stroke: '#10b981' },
          { dataKey: 'converted', stroke: '#f59e0b' },
        ]}
        emptyMessage="No campaign performance data yet"
      />

      {/* Campaign Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Comparison</CardTitle>
          <CardDescription>Performance metrics for all campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Click Rate</TableHead>
                  <TableHead>Conv. Rate</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign: TopCampaign) => {
                  const sent = campaign.sent ?? 0;
                  const opened = campaign.opened ?? 0;
                  const clicked = campaign.clicked ?? 0;
                  const converted = campaign.converted ?? 0;
                  const openRateVal = formatRate(calcOpenRate(opened, sent));
                  const clickRateVal = formatRate(calcClickRate(clicked, sent));
                  const convRateVal = formatRate(calcConversionRate(converted, sent));
                  const roiValue = calcROI(campaign.revenue ?? 0, campaign.spent ?? 0);
                  return (
                    <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge variant="outline">{TYPE_DISPLAY[campaign.type?.toUpperCase()] || campaign.type}</Badge></TableCell>
                      <TableCell>{sent.toLocaleString()}</TableCell>
                      <TableCell>{openRateVal}%</TableCell>
                      <TableCell>{clickRateVal}%</TableCell>
                      <TableCell>{convRateVal}%</TableCell>
                      <TableCell>{fmtMoney(campaign.revenue ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant={roiValue > 0 ? 'success' : 'secondary'}>
                          {formatRate(roiValue)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No campaign data yet
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Time to Send */}
        <Card>
          <CardHeader>
            <CardTitle>Best Time to Send</CardTitle>
            <CardDescription>Share of email opens by time of day (%)</CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Open Share']} />
                  <Bar dataKey="openRate" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hourly data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>Subject lines with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.length > 0 ? topCampaigns.slice(0, 4).map((campaign: TopCampaign) => {
                const sent = campaign.sent ?? 0;
                const opened = campaign.opened ?? 0;
                const clicked = campaign.clicked ?? 0;
                return (
                <div key={campaign.id} className="space-y-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{campaign.name || 'Campaign'}</p>
                    <Badge variant="outline">{formatRate(calcOpenRate(opened, sent))}%</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Open: {formatRate(calcOpenRate(opened, sent))}%</span>
                    <span>Click: {formatRate(calcClickRate(clicked, sent))}%</span>
                  </div>
                </div>
              );
              }) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  No campaign content data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Detailed Reports Tab ─────────────────────────────────────────────────────

function DetailedReportsTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>(computeDateRange('30d'));
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');

  const { data: reportData, isFetching: isLoading, refetch: loadReports } = useQuery({
    queryKey: ['campaignReports', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ limit: 1000 });
      const allCampaigns: Campaign[] = response.data?.campaigns || response.campaigns || [];

      // Filter by date range
      const rangeStart = new Date(dateRange.startDate);
      const rangeEnd = new Date(dateRange.endDate);
      rangeEnd.setHours(23, 59, 59, 999);

      const filteredCampaigns = allCampaigns.filter((c: Campaign) => {
        const created = new Date(c.createdAt || '');
        return created >= rangeStart && created <= rangeEnd;
      });

      const enrichedCampaigns: EnrichedCampaign[] = filteredCampaigns.map((c: Campaign) => {
        const sent = c.recipientCount ?? c.sent ?? 0;
        const delivered = c.delivered ?? 0;
        const opened = c.opened ?? 0;
        const clicked = c.clicked ?? 0;
        const bounced = c.bounced ?? 0;
        const unsubscribed = c.unsubscribed ?? 0;
        const revenue = c.revenue ?? 0;
        return {
          ...c,
          id: c.id,
          name: c.name,
          type: TYPE_DISPLAY[((c.type as string) || '').toUpperCase()] || (c.type as string) || 'Unknown',
          sent, delivered, opened, clicked, bounced, unsubscribed, revenue,
        };
      });

      const totalSent = enrichedCampaigns.reduce((sum: number, c) => sum + c.sent, 0);
      const totalDelivered = enrichedCampaigns.reduce((sum: number, c) => sum + c.delivered, 0);
      const totalOpened = enrichedCampaigns.reduce((sum: number, c) => sum + c.opened, 0);
      const totalClicked = enrichedCampaigns.reduce((sum: number, c) => sum + c.clicked, 0);
      const totalRevenue = enrichedCampaigns.reduce((sum: number, c) => sum + c.revenue, 0);

      // Group trends by date → aggregate campaigns on same day
      const trendMap = new Map<string, { date: string; sent: number; delivered: number; opened: number; clicked: number }>();
      enrichedCampaigns
        .filter((c) => c.sent > 0)
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
        .forEach((c) => {
          const dateKey = new Date(c.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existing = trendMap.get(dateKey);
          if (existing) {
            existing.sent += c.sent;
            existing.delivered += c.delivered;
            existing.opened += c.opened;
            existing.clicked += c.clicked;
          } else {
            trendMap.set(dateKey, {
              date: dateKey,
              sent: c.sent,
              delivered: c.delivered,
              opened: c.opened,
              clicked: c.clicked,
            });
          }
        });

      return {
        campaigns: enrichedCampaigns,
        stats: {
          totalSent,
          deliveryRate: calcDeliveryRate(totalDelivered, totalSent),
          openRate: calcOpenRate(totalOpened, totalSent),
          clickRate: calcClickRate(totalClicked, totalSent),
          revenue: totalRevenue,
        },
        performanceData: Array.from(trendMap.values()),
      };
    },
  });

  const campaigns = reportData?.campaigns ?? [];
  const stats = reportData?.stats ?? { totalSent: 0, deliveryRate: 0, openRate: 0, clickRate: 0, revenue: 0 };
  const performanceData = reportData?.performanceData ?? [];

  // Pagination
  const totalPages = Math.max(1, Math.ceil(campaigns.length / ITEMS_PER_PAGE));
  const paginatedCampaigns = useMemo(() => {
    if (showAllCampaigns) return campaigns;
    const start = (page - 1) * ITEMS_PER_PAGE;
    return campaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [campaigns, page, showAllCampaigns]);

  // Sorted copies for leaderboards — no in-place mutation
  const topByOpenRate = useMemo(() =>
    [...campaigns].sort((a, b) => calcOpenRate(b.opened, b.sent) - calcOpenRate(a.opened, a.sent)).slice(0, 3),
    [campaigns]
  );
  const topByClickRate = useMemo(() =>
    [...campaigns].sort((a, b) => calcClickRate(b.clicked, b.sent) - calcClickRate(a.clicked, a.sent)).slice(0, 3),
    [campaigns]
  );

  const handleDateChange = (range: DateRange, preset: DateRangePreset) => {
    setDateRange(range);
    setDatePreset(preset);
    setPage(1);
  };

  const hasEngagement = stats.openRate > 0 || stats.clickRate > 0;

  if (isLoading) {
    return <LoadingSkeleton rows={5} showChart />;
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        datePreset={datePreset}
        onDateChange={handleDateChange}
        onRefresh={() => loadReports()}
        isRefreshing={isLoading}
        exportLabel="Export CSV"
        onExport={() => {
          if (campaigns.length === 0) { toast.error('No data to export'); return; }
          exportToCSV(campaigns, campaignExportColumns, {
            filename: `campaign-reports-${new Date().toISOString().split('T')[0]}`,
          });
          toast.success('Report exported successfully');
        }}
      />

      {/* Overall Stats — with benchmark color coding */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Sent"
          icon={Mail}
          value={stats.totalSent.toLocaleString()}
          subtitle={`${campaigns.length} campaigns in range`}
        />
        <MetricCard
          title="Delivery Rate"
          icon={TrendingUp}
          value={`${formatRate(stats.deliveryRate, 1)}%`}
          subtitle="Successfully delivered"
        />
        <MetricCard
          title={<>Open Rate<HelpTooltip text="Percentage of sent emails that were opened. Industry average is 20–25%." /></>}
          icon={Eye}
          value={`${formatRate(stats.openRate, 1)}%`}
          valueClassName={benchmarkColor(stats.openRate, BENCHMARKS.openRate)}
          subtitle={`${stats.openRate >= BENCHMARKS.openRate ? 'Above' : 'Below'} industry avg (${BENCHMARKS.openRate}%)`}
        />
        <MetricCard
          title={<>Click Rate<HelpTooltip text="Percentage of sent emails where a link was clicked. A good click rate is 2–5%." /></>}
          icon={MousePointer}
          value={`${formatRate(stats.clickRate, 1)}%`}
          valueClassName={benchmarkColor(stats.clickRate, BENCHMARKS.clickRate)}
          subtitle={`${stats.clickRate >= BENCHMARKS.clickRate ? 'Above' : 'Below'} target (${BENCHMARKS.clickRate}%)`}
        />
        <MetricCard
          title="Revenue"
          icon={DollarSign}
          value={fmtMoney(stats.revenue)}
          subtitle={`From ${campaigns.length} campaigns`}
        />
      </div>

      {stats.totalSent === 0 && (
        <NoEngagementState
          icon={Mail}
          title="No campaign data in this range"
          message="No campaigns were found for the selected date range. Try expanding the range or send your first campaign to see metrics here."
        />
      )}

      {stats.totalSent > 0 && !hasEngagement && (
        <NoEngagementState
          icon={Eye}
          title="Waiting for engagement"
          message="Campaigns have been sent but no opens or clicks recorded yet. Data usually appears within a few hours."
        />
      )}

      {/* Performance Trends — aggregated by date */}
      <PerformanceTrendChart
        title="Campaign Performance Over Time"
        description="Delivery, open, and click trends (aggregated by date)"
        data={performanceData}
        height={300}
        lines={[
          { dataKey: 'sent', stroke: '#3b82f6', name: 'Sent' },
          { dataKey: 'delivered', stroke: '#10b981', name: 'Delivered' },
          { dataKey: 'opened', stroke: '#f59e0b', name: 'Opened' },
          { dataKey: 'clicked', stroke: '#8b5cf6', name: 'Clicked' },
        ]}
        emptyMessage="No performance data for this range"
      />

      {/* Campaign Detail Cards with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Details</CardTitle>
          <CardDescription>Individual campaign metrics and results ({campaigns.length} campaigns)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedCampaigns.map((campaign) => (
              <CampaignDetailCard key={campaign.id} campaign={campaign} onNavigate={(id) => navigate(`/campaigns/${id}`)} />
            ))}
            <PaginationControls
              totalItems={campaigns.length}
              page={page}
              totalPages={totalPages}
              showAll={showAllCampaigns}
              onToggleShowAll={() => setShowAllCampaigns(!showAllCampaigns)}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Funnel</CardTitle>
          <CardDescription>Step-by-step engagement breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const totals = campaigns.reduce((acc, c) => {
                acc.sent += c.sent ?? 0;
                acc.delivered += c.delivered ?? 0;
                acc.opened += c.opened ?? 0;
                acc.clicked += c.clicked ?? 0;
                acc.converted += (c.converted ?? c.conversions ?? 0) as number;
                return acc;
              }, { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 });
              const stages: FunnelStageData[] = [
                { stage: 'Sent', count: totals.sent, percentage: 100, color: 'bg-blue-500' },
                { stage: 'Delivered', count: totals.delivered, percentage: calcDeliveryRate(totals.delivered, totals.sent), color: 'bg-green-500' },
                { stage: 'Opened', count: totals.opened, percentage: calcOpenRate(totals.opened, totals.sent), color: 'bg-orange-500' },
                { stage: 'Clicked', count: totals.clicked, percentage: calcClickRate(totals.clicked, totals.sent), color: 'bg-purple-500' },
                { stage: 'Converted', count: totals.converted, percentage: calcConversionRate(totals.converted, totals.sent), color: 'bg-pink-500' },
              ];
              return stages.map((s) => <FunnelBar key={s.stage} {...s} />);
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Best Performing leaderboards */}
      <div className="grid gap-6 md:grid-cols-2">
        <LeaderboardCard
          title="Best Open Rate"
          description="Campaigns with highest engagement"
          indicatorColor="bg-green-600"
          items={topByOpenRate}
          rateCalc={(item) => calcOpenRate(item.opened, item.sent)}
          valueColor="text-green-600"
          onItemClick={(id) => navigate(`/campaigns/${id}`)}
        />
        <LeaderboardCard
          title="Best Click Rate"
          description="Campaigns driving most clicks"
          indicatorColor="bg-purple-600"
          items={topByClickRate}
          rateCalc={(item) => calcClickRate(item.clicked, item.sent)}
          valueColor="text-purple-600"
          onItemClick={(id) => navigate(`/campaigns/${id}`)}
        />
      </div>
    </div>
  );
}

// ─── Main Page (Tabbed) ─────────────────────────────────────────────────────

const CampaignReports = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');

  return (
    <div className="space-y-6">
      <CampaignsSubNav />

      <div>
        <h1 className="text-3xl font-bold">Campaign Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track performance, analyze trends, and explore detailed campaign metrics
        </p>
      </div>

      <div className="flex border-b" role="tablist" aria-label="Report views">
        <TabButton id="overview" label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton id="detailed" label="Detailed Reports" active={activeTab === 'detailed'} onClick={() => setActiveTab('detailed')} />
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'overview' ? <OverviewTab /> : <DetailedReportsTab />}
      </div>
    </div>
  );
};

export default CampaignReports;
