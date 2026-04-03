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

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  aiApi: {
    getPreferences: vi.fn().mockResolvedValue({ data: { chatbot: {} } }),
    updatePreferences: vi.fn().mockResolvedValue({ data: {} }),
    getInsights: vi.fn().mockResolvedValue({ data: [] }),
  },
  tasksApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/services/intelligenceService', () => ({
  default: {
    getDashboardInsights: vi.fn().mockResolvedValue({ insights: [], scoringModels: [], stats: {} }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: vi.fn().mockReturnValue('0%'),
  fmtMoney: vi.fn().mockReturnValue('$0'),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

import InsightsTab from '@/pages/ai/InsightsTab'

describe('InsightsTab', () => {
  it('renders without crashing', () => {
    renderWithProviders(<InsightsTab />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
