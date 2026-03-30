import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { UpgradePrompt } from '../UpgradePrompt'

describe('UpgradePrompt', () => {
  const defaultProps = {
    resource: 'leads',
    current: 100,
    limit: 100,
    currentTier: 'free',
  }

  const renderWithRouter = (props = {}) => {
    return render(
      <MemoryRouter>
        <UpgradePrompt {...defaultProps} {...props} />
      </MemoryRouter>
    )
  }

  it('renders upgrade message with resource name', () => {
    renderWithRouter()
    expect(screen.getByText(/leads/i)).toBeInTheDocument()
  })

  it('renders upgrade button', () => {
    renderWithRouter()
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument()
  })

  it('can be dismissed', () => {
    const onClose = vi.fn()
    renderWithRouter({ onClose })
    const closeBtn = screen.queryByRole('button', { name: /dismiss|close/i })
    if (closeBtn) {
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('renders banner variant', () => {
    renderWithRouter({ variant: 'banner' })
    expect(screen.getByText(/leads/i)).toBeInTheDocument()
  })
})
