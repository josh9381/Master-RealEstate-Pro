/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getDashboard: vi.fn().mockResolvedValue({ data: {} }),
    getDashboardStats: vi.fn().mockResolvedValue({ data: {} }),
    getLeadAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getTeamPerformance: vi.fn().mockResolvedValue({ data: { members: [] } }),
    getRevenueTimeline: vi.fn().mockResolvedValue({ data: { months: [] } }),
  },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
}))
vi.mock('@/components/shared/DateRangePicker', () => ({
  DateRangePicker: () => <div data-testid="date-picker" />,
  DateRange: {},
  computeDateRange: () => ({ startDate: '', endDate: '' }),
}))
vi.mock('@/components/shared/AnalyticsEmptyState', () => ({
  AnalyticsEmptyState: () => <div>No data</div>,
}))
vi.mock('@/components/shared/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
}))

import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard'

describe('AnalyticsDashboard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AnalyticsDashboard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
