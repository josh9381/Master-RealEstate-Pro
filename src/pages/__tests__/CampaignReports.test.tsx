/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  campaignsApi: {
    getCampaigns: vi.fn().mockResolvedValue({ data: { campaigns: [] } }),
  },
  analyticsApi: {
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcOpenRate: vi.fn(() => 0),
  calcClickRate: vi.fn(() => 0),
  calcConversionRate: vi.fn(() => 0),
  calcDeliveryRate: vi.fn(() => 0),
  calcBounceRate: vi.fn(() => 0),
  calcUnsubscribeRate: vi.fn(() => 0),
  calcROI: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
}))
vi.mock('@/lib/exportService', () => ({
  exportToCSV: vi.fn(),
  campaignExportColumns: [],
}))
vi.mock('@/components/shared/DateRangePicker', () => ({
  DateRangePicker: () => <div />,
  DateRange: {},
  DateRangePreset: {},
  computeDateRange: () => ({ startDate: '', endDate: '' }),
}))
vi.mock('@/components/shared/AnalyticsEmptyState', () => ({
  AnalyticsEmptyState: () => <div />,
}))
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}))

import CampaignReports from '@/pages/campaigns/CampaignReports'

describe('CampaignReports', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignReports />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
