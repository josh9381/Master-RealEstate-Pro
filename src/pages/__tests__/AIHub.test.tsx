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
    getStats: vi.fn().mockResolvedValue({ data: { activeModels: 0, modelsInTraining: 0, avgAccuracy: 0, accuracyChange: 0 } }),
    getFeatures: vi.fn().mockResolvedValue({ data: [] }),
    getInsights: vi.fn().mockResolvedValue({ data: [] }),
    getQuickActions: vi.fn().mockResolvedValue({ data: [] }),
  },
  tasksApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcProgress: vi.fn().mockReturnValue(0),
}))

import AIHub from '@/pages/ai/AIHub'

describe('AIHub', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AIHub />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
