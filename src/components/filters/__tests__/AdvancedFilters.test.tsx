import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  tagsApi: {
    getTags: vi.fn().mockResolvedValue({ data: { tags: [] } }),
  },
  usersApi: {
    getUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { AdvancedFilters } from '../AdvancedFilters'

describe('AdvancedFilters', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  const defaultFilters = {
    status: [],
    source: [],
    scoreRange: [0, 100] as [number, number],
    dateRange: { from: '', to: '' },
    tags: [],
    assignedTo: [],
  }

  it('renders without crashing', () => {
    render(
      <AdvancedFilters
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        currentFilters={defaultFilters}
      />,
      { wrapper: createWrapper() }
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
