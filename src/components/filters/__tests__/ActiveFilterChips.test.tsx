import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips'

const chips = [
  { id: 'status', label: 'Status', value: 'HOT' },
  { id: 'source', label: 'Source', value: 'Website' },
]

describe('ActiveFilterChips', () => {
  it('renders nothing when chips array is empty', () => {
    const { container } = render(
      <ActiveFilterChips chips={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders chip labels and values', () => {
    render(<ActiveFilterChips chips={chips} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('HOT')).toBeInTheDocument()
    expect(screen.getByText('Source:')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
  })

  it('shows result count when provided', () => {
    render(<ActiveFilterChips chips={chips} onRemove={vi.fn()} onClearAll={vi.fn()} resultCount={42} />)
    expect(screen.getByText(/42 results/)).toBeInTheDocument()
  })

  it('does not show result count when not provided', () => {
    render(<ActiveFilterChips chips={chips} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    expect(screen.queryByText(/results/)).not.toBeInTheDocument()
  })

  it('calls onRemove with chip id when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<ActiveFilterChips chips={chips} onRemove={onRemove} onClearAll={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }))
    expect(onRemove).toHaveBeenCalledWith('status')
  })

  it('calls onClearAll when Clear all is clicked', () => {
    const onClearAll = vi.fn()
    render(<ActiveFilterChips chips={chips} onRemove={vi.fn()} onClearAll={onClearAll} />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onClearAll).toHaveBeenCalled()
  })

  it('renders a remove button for each chip with accessible name', () => {
    render(<ActiveFilterChips chips={chips} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Remove Status filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Source filter' })).toBeInTheDocument()
  })
})
