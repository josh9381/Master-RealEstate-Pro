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
  leadsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  aiApi: {
    getLeadScores: vi.fn().mockResolvedValue({ data: { leads: [], stats: {} } }),
    getModelPerformance: vi.fn().mockResolvedValue({ data: { history: [], currentModels: [] } }),
    trainModel: vi.fn().mockResolvedValue({ data: {} }),
    getTrainingStatus: vi.fn().mockResolvedValue({ data: { models: [] } }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn().mockReturnValue(0),
  formatRate: vi.fn().mockReturnValue('0%'),
}))

vi.mock('@/lib/chartColors', () => ({
  CHART_COLORS: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE'],
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

import LeadScoring from '@/pages/ai/LeadScoring'

describe('LeadScoring', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadScoring />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
