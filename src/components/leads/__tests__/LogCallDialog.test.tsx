import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  callsApi: {
    logCall: vi.fn(),
  },
}))

import { LogCallDialog } from '../LogCallDialog'

describe('LogCallDialog', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <LogCallDialog
          open={true}
          onOpenChange={vi.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
