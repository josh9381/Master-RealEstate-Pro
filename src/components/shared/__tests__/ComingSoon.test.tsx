import { render, screen, fireEvent } from '@testing-library/react'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { Star } from 'lucide-react'
import { useToast as _useToast } from '@/hooks/useToast'

const mockToastSuccess = vi.fn()

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: { success: mockToastSuccess, error: vi.fn(), info: vi.fn() },
  })),
}))

describe('ComingSoon', () => {
  it('renders title and description', () => {
    render(<ComingSoon title="New Feature" description="This is coming soon!" icon={Star} />)
    expect(screen.getByText('New Feature')).toBeInTheDocument()
    expect(screen.getByText('This is coming soon!')).toBeInTheDocument()
  })

  it('displays "Coming Soon" badge', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} />)
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('shows timeline badge when provided', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} timeline="Q2 2026" />)
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
  })

  it('does not show timeline badge when not provided', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} />)
    expect(screen.queryByText('Q2 2026')).not.toBeInTheDocument()
  })

  it('shows preview items when provided', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} previewItems={['Item 1', 'Item 2']} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('does not show preview section when no previewItems', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} />)
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
  })

  it('shows "Notify Me" button', () => {
    render(<ComingSoon title="Feature" description="Desc" icon={Star} />)
    expect(screen.getByRole('button', { name: /notify me when available/i })).toBeInTheDocument()
  })

  it('shows toast and updates button state when Notify Me is clicked', () => {
    mockToastSuccess.mockClear()
    render(<ComingSoon title="My Feature" description="Desc" icon={Star} />)
    fireEvent.click(screen.getByRole('button', { name: /notify me when available/i }))

    expect(mockToastSuccess).toHaveBeenCalledWith("We'll notify you when My Feature is available!")
    expect(screen.getByRole('button', { name: /notification set/i })).toBeDisabled()
  })
})
