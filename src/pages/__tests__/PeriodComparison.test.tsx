/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  analyticsApi: {
    getPeriodComparison: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('@/components/shared/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
}))

import PeriodComparison from '@/pages/analytics/PeriodComparison'

describe('PeriodComparison', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PeriodComparison />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
