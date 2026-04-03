/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = {
        user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin', avatar: null, subscription: { plan: 'pro', status: 'active' } },
        isAdmin: () => true,
        isManager: () => true,
        hasPermission: () => true,
        getSubscriptionTier: () => 'PROFESSIONAL',
        isTrialActive: () => false,
        logout: vi.fn(),
      }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', role: 'admin' }, isAdmin: () => true, logout: vi.fn() }) }
  ),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          subscription: { tier: 'PROFESSIONAL', name: 'Professional', price: 49 },
          usage: {
            users: { current: 3, limit: 10 },
            leads: { current: 100, limit: 1000 },
            campaigns: { current: 5, limit: 50 },
            workflows: { current: 2, limit: 20 },
          },
        },
      },
    }),
  },
}))

import { SubscriptionStatus } from '../SubscriptionStatus'

describe('SubscriptionStatus', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it('renders without crashing', () => {
    render(<SubscriptionStatus />, { wrapper: createWrapper() })
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
