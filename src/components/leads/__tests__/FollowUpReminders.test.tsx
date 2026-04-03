import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  remindersApi: {
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/pushNotifications', () => ({
  isPushSupported: vi.fn().mockReturnValue(false),
  isPushSubscribed: vi.fn().mockResolvedValue(false),
  registerPush: vi.fn().mockResolvedValue(false),
}))

import { FollowUpReminders } from '../FollowUpReminders'

describe('FollowUpReminders', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <FollowUpReminders leadId="1" leadName="Test Lead" />
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
