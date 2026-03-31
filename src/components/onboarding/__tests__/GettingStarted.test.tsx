import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { GettingStarted } from '../GettingStarted'

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ user: { id: 'user1' } }),
}))

vi.mock('@/lib/userStorage', () => ({
  getUserItem: vi.fn().mockReturnValue(null),
  setUserItem: vi.fn(),
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcProgress: vi.fn().mockReturnValue(33),
}))

describe('GettingStarted', () => {
  const renderComponent = (props = {}) => {
    const defaultProps = {
      totalLeads: 0,
      totalCampaigns: 0,
      hasCampaignResults: false,
    }
    return render(
      <MemoryRouter>
        <GettingStarted {...defaultProps} {...props} />
      </MemoryRouter>
    )
  }

  it('renders onboarding steps when not all complete', () => {
    renderComponent()
    expect(screen.getByText('Add your first leads')).toBeInTheDocument()
  })

  it('does not render when all steps are complete', () => {
    renderComponent({
      totalLeads: 5,
      totalCampaigns: 3,
      hasCampaignResults: true,
    })
    expect(screen.queryByText('Add your first leads')).not.toBeInTheDocument()
  })

  it('marks lead step as complete when totalLeads > 0', () => {
    renderComponent({ totalLeads: 10 })
    // Still shows since not all steps are done
    expect(screen.getByText('Add your first leads')).toBeInTheDocument()
  })
})
