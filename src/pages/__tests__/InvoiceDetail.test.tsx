/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', role: 'admin', organization: { name: 'Test Org' }, subscription: { plan: 'pro', status: 'active' } }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

import InvoiceDetail from '@/pages/billing/InvoiceDetail'

describe('InvoiceDetail', () => {
  it('renders without crashing', () => {
    renderWithProviders(<InvoiceDetail />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
