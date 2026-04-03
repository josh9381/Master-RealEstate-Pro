import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageEmptyState } from '@/components/ui/PageEmptyState'

describe('PageEmptyState', () => {
  it('renders title', () => {
    render(<PageEmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<PageEmptyState title="Empty" description="Try adding some items" />)
    expect(screen.getByText('Try adding some items')).toBeInTheDocument()
  })

  it('renders action button and calls onAction', async () => {
    const onAction = vi.fn()
    render(<PageEmptyState title="Empty" actionLabel="Add Item" onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when actionLabel is missing', () => {
    render(<PageEmptyState title="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
