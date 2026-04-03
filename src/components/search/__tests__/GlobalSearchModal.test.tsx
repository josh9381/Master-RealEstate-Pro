/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test', role: 'admin' }, isAdmin: () => true, hasPermission: () => true }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test', role: 'admin' } }) }
  ),
}))

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}))

vi.mock('@/lib/userStorage', () => ({
  getUserItem: vi.fn().mockReturnValue(null),
  setUserItem: vi.fn(),
}))

import { GlobalSearchModal } from '../GlobalSearchModal'

describe('GlobalSearchModal', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <GlobalSearchModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
