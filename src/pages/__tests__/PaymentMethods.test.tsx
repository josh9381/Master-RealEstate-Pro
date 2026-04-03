import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  billingApi: {
    getPaymentMethods: vi.fn().mockResolvedValue({ data: [], message: '' }),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

import PaymentMethods from '@/pages/billing/PaymentMethods'

describe('PaymentMethods', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PaymentMethods />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
