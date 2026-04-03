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

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  aiApi: {
    getModelPerformance: vi.fn().mockResolvedValue({ data: { history: [], currentModels: [] } }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: vi.fn().mockReturnValue('0%'),
  calcRate: vi.fn().mockReturnValue(0),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

import AIAnalytics from '@/pages/ai/AIAnalytics'

describe('AIAnalytics', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AIAnalytics />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
