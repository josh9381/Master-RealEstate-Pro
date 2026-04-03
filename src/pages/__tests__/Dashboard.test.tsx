/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getDashboardStats: vi.fn().mockResolvedValue({ data: {} }),
    getLeadAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
    getConversionFunnel: vi.fn().mockResolvedValue({ data: { stages: [] } }),
    getActivityFeed: vi.fn().mockResolvedValue({ data: { activities: [] } }),
  },
  campaignsApi: { getCampaigns: vi.fn().mockResolvedValue({ data: { campaigns: [] } }) },
  tasksApi: {
    getTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    updateTask: vi.fn(),
    completeTask: vi.fn(),
  },
  appointmentsApi: { getUpcoming: vi.fn().mockResolvedValue({ data: { appointments: [] } }) },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcProgress: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
}))
vi.mock('@/components/onboarding/GettingStarted', () => ({
  GettingStarted: () => <div data-testid="getting-started" />,
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
}))

import Dashboard from '@/pages/dashboard/Dashboard'

describe('Dashboard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Dashboard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
