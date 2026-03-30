import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal'

describe('KeyboardShortcutsModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getAllByText(/keyboard shortcuts/i).length).toBeGreaterThanOrEqual(1)
  })

  it('displays navigation shortcuts', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Go to Leads')).toBeInTheDocument()
  })

  it('displays shortcut categories', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getAllByText('Navigation').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
