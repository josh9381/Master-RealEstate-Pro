import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '../ConfirmDialog'
import { useConfirmStore } from '@/store/confirmStore'

vi.mock('@/store/confirmStore')

const mockUseConfirmStore = vi.mocked(useConfirmStore)

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when options is null', () => {
    mockUseConfirmStore.mockReturnValue({ open: false, options: null, close: vi.fn() } as any)
    const { container } = render(<ConfirmDialog />)
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog with title and message when open', () => {
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: { title: 'Delete item?', message: 'This cannot be undone.' },
      close: vi.fn(),
    } as any)
    render(<ConfirmDialog />)
    expect(screen.getByText('Delete item?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('shows default Cancel and Confirm buttons', () => {
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: { title: 'Are you sure?', message: 'Please confirm.' },
      close: vi.fn(),
    } as any)
    render(<ConfirmDialog />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('uses custom cancelLabel and confirmLabel', () => {
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: {
        title: 'Remove',
        message: 'Are you sure?',
        cancelLabel: 'No',
        confirmLabel: 'Yes, Remove',
      },
      close: vi.fn(),
    } as any)
    render(<ConfirmDialog />)
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Yes, Remove')).toBeInTheDocument()
  })

  it('calls close(false) when Cancel is clicked', () => {
    const close = vi.fn()
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: { title: 'Are you sure?', message: 'Sure?' },
      close,
    } as any)
    render(<ConfirmDialog />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).toHaveBeenCalledWith(false)
  })

  it('calls close(true) when Confirm is clicked', () => {
    const close = vi.fn()
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: { title: 'Are you sure?', message: 'Sure?' },
      close,
    } as any)
    render(<ConfirmDialog />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(close).toHaveBeenCalledWith(true)
  })

  it('uses destructive variant button when variant="destructive"', () => {
    mockUseConfirmStore.mockReturnValue({
      open: true,
      options: { title: 'Delete?', message: 'Permanent?', variant: 'destructive', confirmLabel: 'Delete' },
      close: vi.fn(),
    } as any)
    render(<ConfirmDialog />)
    const confirmBtn = screen.getByRole('button', { name: 'Delete' })
    expect(confirmBtn).toBeInTheDocument()
  })
})
