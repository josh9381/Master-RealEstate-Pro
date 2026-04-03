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

// Mock lazy-loaded child tabs as simple divs
vi.mock('./InsightsTab', () => ({ default: () => <div>InsightsTab</div> }))
vi.mock('./PredictionsTab', () => ({ default: () => <div>PredictionsTab</div> }))

import IntelligenceHub from '@/pages/ai/IntelligenceHub'

describe('IntelligenceHub', () => {
  it('renders without crashing', () => {
    renderWithProviders(<IntelligenceHub />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
