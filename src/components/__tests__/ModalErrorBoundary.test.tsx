import { render, screen, fireEvent } from '@testing-library/react'
import { ModalErrorBoundary } from '../ModalErrorBoundary'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test error')
  return <div>Content loaded</div>
}

describe('ModalErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress React's error logging in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(
      <ModalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ModalErrorBoundary>
    )
    expect(screen.getByText('Content loaded')).toBeInTheDocument()
  })

  it('shows error UI when a child throws', () => {
    render(
      <ModalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ModalErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows component name in error message when name prop is provided', () => {
    render(
      <ModalErrorBoundary name="Lead Form">
        <ThrowError shouldThrow={true} />
      </ModalErrorBoundary>
    )
    expect(screen.getByText(/Lead Form/)).toBeInTheDocument()
  })

  it('shows generic error message when no name is provided', () => {
    render(
      <ModalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ModalErrorBoundary>
    )
    expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument()
  })

  it('shows Close button in error state', () => {
    render(
      <ModalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ModalErrorBoundary>
    )
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ModalErrorBoundary onClose={onClose}>
        <ThrowError shouldThrow={true} />
      </ModalErrorBoundary>
    )
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
