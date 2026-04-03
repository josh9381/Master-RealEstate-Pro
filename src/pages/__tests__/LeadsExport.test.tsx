/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin', subscription: { plan: 'pro', status: 'active' } }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' }, isAdmin: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))

vi.mock('@/lib/api', () => ({
  leadsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  usersApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  exportApi: {
    download: vi.fn().mockResolvedValue({}),
  },
}))

import LeadsExport from '@/pages/leads/LeadsExport'

describe('LeadsExport', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsExport />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
