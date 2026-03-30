import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { usePageTitle } from '../usePageTitle'

// Mock the notifications API
vi.mock('@/lib/api', () => ({
  notificationsApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: { count: 0 } }),
  },
}))

import { notificationsApi } from '@/lib/api'

function wrapperWithPath(path: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = ''
  })

  it('sets document.title for /dashboard', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/dashboard') })
    await waitFor(() => {
      expect(document.title).toContain('Dashboard')
    })
  })

  it('sets document.title for /leads', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/leads') })
    await waitFor(() => {
      expect(document.title).toContain('Leads')
    })
  })

  it('sets document.title for /campaigns', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/campaigns') })
    await waitFor(() => {
      expect(document.title).toContain('Campaigns')
    })
  })

  it('sets title for dynamic route /leads/:id', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/leads/12345678-1234-1234-1234-123456789abc') })
    await waitFor(() => {
      expect(document.title).toContain('Leads Detail')
    })
  })

  it('includes brand name "RealEstate Pro" in title', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/dashboard') })
    await waitFor(() => {
      expect(document.title).toContain('RealEstate Pro')
    })
  })

  it('prepends unread count when notifications exist', async () => {
    localStorage.setItem('accessToken', 'test-token')
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ data: { count: 5 } } as never)
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/dashboard') })
    await waitFor(() => {
      expect(document.title).toMatch(/^\(5\)/)
    })
  })


  it('humanizes unknown route segments', async () => {
    renderHook(() => usePageTitle(), { wrapper: wrapperWithPath('/some-unknown-page') })
    await waitFor(() => {
      expect(document.title).toContain('Some Unknown Page')
    })
  })
})
