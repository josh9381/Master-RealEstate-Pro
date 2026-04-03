/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getLeadAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
  calcProgress: vi.fn(() => 0),
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
}))

import LeadAnalytics from '@/pages/analytics/LeadAnalytics'

describe('LeadAnalytics', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadAnalytics />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
