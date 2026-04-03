/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
  calcProgress: vi.fn(() => 0),
  calcRateClamped: vi.fn(() => 0),
}))

vi.mock('@/components/subscription/FeatureGate', () => ({
  FeatureGate: ({ children }: any) => <div>{children}</div>,
  UsageBadge: () => <div />,
}))

vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/lib/api', () => ({
  leadsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getStats: vi.fn().mockResolvedValue({ data: { total: 0, new: 0, contacted: 0, qualified: 0 } }),
  },
}))

import LeadsOverview from '@/pages/leads/LeadsOverview'

describe('LeadsOverview', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsOverview />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
