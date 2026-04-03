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
    getGlobalPredictions: vi.fn().mockResolvedValue({
      data: {
        predictions: [],
        stats: { activePredictions: 0, avgConfidence: 0, highImpactAlerts: 0, accuracy: 0 },
        revenueForecast: [],
        conversionTrend: [],
        stageDistribution: [],
        pipelineSummary: { avgDaysInPipeline: 0, totalPipelineValue: 0, activeDeals: 0 },
      },
    }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  fmtMoney: vi.fn().mockReturnValue('$0'),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

import PredictionsTab from '@/pages/ai/PredictionsTab'

describe('PredictionsTab', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PredictionsTab />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
