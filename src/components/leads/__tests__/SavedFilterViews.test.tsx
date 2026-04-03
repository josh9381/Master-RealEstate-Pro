import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  savedFiltersApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
  },
}))

import { SavedFilterViews } from '../SavedFilterViews'

describe('SavedFilterViews', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const currentFilters = {
      status: [],
      source: [],
      scoreRange: [0, 100] as [number, number],
      dateRange: { from: '', to: '' },
      tags: [],
      assignedTo: [],
    }
    render(
      <QueryClientProvider client={qc}>
        <SavedFilterViews
          currentFilters={currentFilters}
          currentScoreFilter=""
          onLoadView={vi.fn()}
          hasActiveFilters={false}
        />
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
