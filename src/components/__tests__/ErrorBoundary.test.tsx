import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// A component that throws to trigger the boundary
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    // Should show error UI instead of crashing
    expect(screen.queryByText('No error')).not.toBeInTheDocument()
    // Should have some error indication
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('displays a refresh button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    // Should have a retry/refresh button
    const refreshButton = screen.getAllByRole('button')
    expect(refreshButton.length).toBeGreaterThan(0)
  })
})
