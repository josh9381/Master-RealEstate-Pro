import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    () => ({
      user: { id: '1', role: 'admin', subscription: { plan: 'pro', status: 'active' } },
      getSubscriptionTier: () => 'pro',
      isTrialActive: () => false,
    }),
    {
      getState: () => ({
        user: { id: '1', role: 'admin', subscription: { plan: 'pro', status: 'active' } },
        getSubscriptionTier: () => 'pro',
        isTrialActive: () => false,
      }),
    }
  ),
}))
vi.mock('@/lib/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn().mockResolvedValue({ data: {} }) },
  billingApi: {
    getSubscription: vi.fn().mockResolvedValue({ data: { plan: 'pro', status: 'active' } }),
    getInvoices: vi.fn().mockResolvedValue({ data: { invoices: [] } }),
    getPaymentMethods: vi.fn().mockResolvedValue({ data: { paymentMethods: [] } }),
    getUsage: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
}))

import BillingPage from '@/pages/billing/BillingPage'

describe('BillingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<BillingPage />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
