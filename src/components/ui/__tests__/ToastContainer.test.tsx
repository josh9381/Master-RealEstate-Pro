import { render, screen, fireEvent } from '@testing-library/react'
import { ToastContainer } from '../ToastContainer'
import { useToastStore } from '@/store/toastStore'

vi.mock('@/store/toastStore')

const mockUseToastStore = vi.mocked(useToastStore)

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when there are no toasts', () => {
    mockUseToastStore.mockReturnValue({ toasts: [], removeToast: vi.fn(), addToast: vi.fn(), clearAll: vi.fn() })
    const { container } = render(<ToastContainer />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a toast message', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [{ id: '1', type: 'success', message: 'Saved successfully!' }],
      removeToast: vi.fn(),
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    expect(screen.getByText('Saved successfully!')).toBeInTheDocument()
  })

  it('renders toast description when provided', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [{ id: '1', type: 'info', message: 'Info', description: 'More details' }],
      removeToast: vi.fn(),
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    expect(screen.getByText('More details')).toBeInTheDocument()
  })

  it('shows dismiss button for each toast', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [{ id: '1', type: 'success', message: 'Toast!' }],
      removeToast: vi.fn(),
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument()
  })

  it('calls removeToast when dismiss button is clicked', () => {
    const removeToast = vi.fn()
    mockUseToastStore.mockReturnValue({
      toasts: [{ id: 'toast-1', type: 'error', message: 'Error occurred' }],
      removeToast,
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    fireEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(removeToast).toHaveBeenCalledWith('toast-1')
  })

  it('renders multiple toasts', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [
        { id: '1', type: 'success', message: 'First toast' },
        { id: '2', type: 'error', message: 'Second toast' },
      ],
      removeToast: vi.fn(),
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
  })

  it('renders with aria-live="polite"', () => {
    mockUseToastStore.mockReturnValue({
      toasts: [{ id: '1', type: 'info', message: 'Hello' }],
      removeToast: vi.fn(),
      addToast: vi.fn(),
      clearAll: vi.fn(),
    })
    render(<ToastContainer />)
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})
