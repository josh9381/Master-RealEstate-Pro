/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', role: 'admin' }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))

vi.mock('@/lib/api', () => ({
  aiApi: {
    getCostDashboard: vi.fn().mockResolvedValue({
      data: {
        period: '30d',
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        byModel: [],
        byUser: [],
        costHistory: [],
        budget: { warning: 0, caution: 0, hardLimit: 0, alertEnabled: false, currentSpend: 0, percentUsed: 0 },
      },
    }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  formatCurrency: vi.fn().mockReturnValue('$0.00'),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

import AICostDashboard from '@/pages/ai/AICostDashboard'

describe('AICostDashboard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AICostDashboard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
