import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FeatureGate } from '@/components/subscription/FeatureGate'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    getSubscriptionTier: () => 'professional',
  }),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          subscription: { tier: 'professional' },
          usage: {
            leads: { current: 5, limit: 100, remaining: 95, isAtLimit: false },
            campaigns: { current: 1, limit: 50, remaining: 49, isAtLimit: false },
            workflows: { current: 0, limit: 10, remaining: 10, isAtLimit: false },
            users: { current: 1, limit: 5, remaining: 4, isAtLimit: false },
          },
        },
      },
    }),
  },
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('FeatureGate', () => {
  it('renders children when within limits', async () => {
    renderWithProviders(
      <FeatureGate resource="leads">
        <p>Lead form</p>
      </FeatureGate>
    )
    expect(screen.getByText('Lead form')).toBeInTheDocument()
  })
})
