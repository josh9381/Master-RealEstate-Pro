import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  billingApi: {
    getSubscription: vi.fn().mockResolvedValue({ success: true, data: { plan: 'STARTER', status: 'active', currentPeriodEnd: null, trialEndsAt: null, stripeConfigured: false } }),
    getInvoices: vi.fn().mockResolvedValue({ data: [] }),
    createCheckoutSession: vi.fn().mockResolvedValue({ url: '' }),
    cancelSubscription: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

import BillingSubscriptionPage from '@/pages/billing/BillingSubscriptionPage'

describe('BillingSubscriptionPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<BillingSubscriptionPage />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
