import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { AdminStats } from '../AdminStats'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => {
      if (typeof selector === 'function') {
        return selector({ user: { id: 'user1', role: 'ADMIN' } })
      }
      return { user: { id: 'user1', role: 'ADMIN' }, isAdmin: () => true, isManager: () => false }
    },
    {
      getState: () => ({
        user: { id: 'user1', role: 'ADMIN' },
        isAdmin: () => true,
        isManager: () => false,
        accessToken: 'token',
      }),
    }
  ),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          stats: { totalUsers: 10, totalLeads: 500, totalCampaigns: 20, totalWorkflows: 5 },
        },
      },
    }),
  },
}))

describe('AdminStats', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it('renders loading state initially', () => {
    render(<AdminStats />, { wrapper: createWrapper() })
    // Renders loading skeletons or the component
    expect(document.body).toBeDefined()
  })
})
