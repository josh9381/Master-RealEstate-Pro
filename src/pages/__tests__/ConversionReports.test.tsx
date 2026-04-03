/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getLeadAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
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
}))

import ConversionReports from '@/pages/analytics/ConversionReports'

describe('ConversionReports', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ConversionReports />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
