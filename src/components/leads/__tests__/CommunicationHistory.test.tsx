import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  messagesApi: {
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
  },
  callsApi: {
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import { CommunicationHistory } from '../CommunicationHistory'

describe('CommunicationHistory', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <CommunicationHistory leadId="1" leadName="Test Lead" />
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
