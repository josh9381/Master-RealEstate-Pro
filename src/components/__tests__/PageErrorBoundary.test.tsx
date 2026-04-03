import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}))

describe('PageErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <MemoryRouter>
        <PageErrorBoundary pageName="Dashboard">
          <p>Dashboard content</p>
        </PageErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    const ThrowingChild = () => {
      throw new Error('Unexpected failure')
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <MemoryRouter>
        <PageErrorBoundary pageName="Settings">
          <ThrowingChild />
        </PageErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('Page Not Available')).toBeInTheDocument()
    spy.mockRestore()
  })
})
