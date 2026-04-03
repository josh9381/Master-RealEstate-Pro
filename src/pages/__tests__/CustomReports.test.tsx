/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getDashboardStats: vi.fn().mockResolvedValue({ data: {} }),
    getLeadAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  },
  savedReportsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
  reportSchedulesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
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
vi.mock('@/components/shared/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/lib/exportService', () => ({
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
  exportAnalyticsAsPDF: vi.fn(),
  ExportColumn: {},
}))
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
}))

import CustomReports from '@/pages/analytics/CustomReports'

describe('CustomReports', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CustomReports />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
