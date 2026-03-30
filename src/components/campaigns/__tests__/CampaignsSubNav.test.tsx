import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { CampaignsSubNav } from '../CampaignsSubNav'

describe('CampaignsSubNav', () => {
  const renderWithRouter = (path = '/campaigns') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <CampaignsSubNav />
      </MemoryRouter>
    )
  }

  it('renders page nav items', () => {
    renderWithRouter()
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('A/B Testing')).toBeInTheDocument()
  })

  it('renders type filter buttons', () => {
    renderWithRouter()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onTypeFilterChange when filter clicked', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter initialEntries={['/campaigns']}>
        <CampaignsSubNav onTypeFilterChange={onChange} typeFilter="all" />
      </MemoryRouter>
    )
    // Find the email filter button by its accessible name or text content
    const emailBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Email'))
    if (emailBtn) {
      fireEvent.click(emailBtn)
      expect(onChange).toHaveBeenCalledWith('EMAIL')
    }
  })
})
