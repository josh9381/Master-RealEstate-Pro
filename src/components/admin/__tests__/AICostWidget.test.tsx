import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  aiApi: {
    getUsageLimits: vi.fn().mockResolvedValue({
      data: {
        tier: 'pro',
        useOwnKey: false,
        month: '2026-04',
        usage: {
          aiMessages: 10,
          contentGenerations: 5,
          composeUses: 3,
          scoringRecalculations: 2,
          enhancements: 1,
          totalTokensUsed: 5000,
          totalCost: 1.5,
        },
        limits: {
          maxMonthlyAIMessages: 100,
          maxTokensPerRequest: 4000,
          maxContentGenerations: 50,
          maxComposeUses: 30,
          maxScoringRecalculations: 20,
          aiRateLimit: 10,
        },
      },
    }),
  },
}))

import { AICostWidget } from '../AICostWidget'

describe('AICostWidget', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it('renders without crashing', () => {
    render(<AICostWidget />, { wrapper: createWrapper() })
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
