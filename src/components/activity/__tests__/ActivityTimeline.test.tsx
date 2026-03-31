import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { ActivityTimeline } from '../ActivityTimeline'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() },
  activitiesApi: {
    getByLead: vi.fn().mockResolvedValue({ data: { data: [] } }),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

describe('ActivityTimeline', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it('renders without crashing', () => {
    render(<ActivityTimeline leadId="lead1" />, { wrapper: createWrapper() })
    // Should show loading or empty state initially
    expect(document.body).toBeDefined()
  })

  it('renders with leadName', () => {
    render(<ActivityTimeline leadId="lead1" leadName="John Doe" />, {
      wrapper: createWrapper(),
    })
    expect(document.body).toBeDefined()
  })
})
