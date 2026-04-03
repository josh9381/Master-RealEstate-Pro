/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getDashboardStats: vi.fn().mockResolvedValue({ data: {} }),
    getUsageStats: vi.fn().mockResolvedValue({ data: {} }),
    getActivityFeed: vi.fn().mockResolvedValue({ data: { activities: [] } }),
  },
}))
vi.mock('@/components/shared/DateRangePicker', () => ({
  DateRangePicker: () => <div />,
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
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
}))

import UsageAnalytics from '@/pages/analytics/UsageAnalytics'

describe('UsageAnalytics', () => {
  it('renders without crashing', () => {
    renderWithProviders(<UsageAnalytics />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
