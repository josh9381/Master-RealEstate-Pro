import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BulkActionsBar } from '../BulkActionsBar'

describe('BulkActionsBar', () => {
  const defaultProps = {
    selectedCount: 5,
    onClearSelection: vi.fn(),
  }

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsBar selectedCount={0} onClearSelection={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders selection count', () => {
    render(<BulkActionsBar {...defaultProps} />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('calls onClearSelection when clear button clicked', () => {
    const onClear = vi.fn()
    render(<BulkActionsBar selectedCount={3} onClearSelection={onClear} />)
    const clearBtn = screen.getByRole('button', { name: /clear|deselect/i })
    fireEvent.click(clearBtn)
    expect(onClear).toHaveBeenCalled()
  })

  it('renders export button when onExport provided', () => {
    const onExport = vi.fn()
    render(<BulkActionsBar {...defaultProps} onExport={onExport} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('renders delete button when onDelete provided', () => {
    const onDelete = vi.fn()
    render(<BulkActionsBar {...defaultProps} onDelete={onDelete} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('renders email button when onBulkEmail provided', () => {
    const onEmail = vi.fn()
    render(<BulkActionsBar {...defaultProps} onBulkEmail={onEmail} />)
    expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument()
  })
})
