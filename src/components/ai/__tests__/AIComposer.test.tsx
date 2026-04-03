import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getApiBaseUrl: () => 'http://localhost:3000',
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))
vi.mock('@/store/authStore', () => {
  const store = Object.assign(() => 'fake-token', {
    getState: () => ({ accessToken: 'fake-token', user: { id: '1', role: 'admin' } }),
    subscribe: vi.fn(() => vi.fn()),
  })
  return { useAuthStore: store }
})
vi.mock('@/lib/metricsCalculator', () => ({
  formatCurrency: (v: number) => `$${v}`,
  formatRate: (v: number) => `${v}%`,
}))
vi.mock('./VariationsPanel', () => ({
  VariationsPanel: () => <div data-testid="variations-panel" />,
}))

import { AIComposer } from '../AIComposer'

describe('AIComposer', () => {
  it('renders without crashing', () => {
    render(
      <AIComposer
        leadId="lead-1"
        conversationId="conv-1"
        messageType="email"
        onMessageGenerated={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
