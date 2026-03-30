import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LeadsSubNav } from '../LeadsSubNav'

vi.mock('@/components/subscription/FeatureGate', () => ({
  FeatureGate: ({ children }: any) => <>{children}</>,
  UsageBadge: () => null,
}))

describe('LeadsSubNav', () => {
  const renderWithRouter = (path = '/leads') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <LeadsSubNav />
      </MemoryRouter>
    )
  }

  it('renders nav items', () => {
    renderWithRouter()
    expect(screen.getByText('All Leads')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('renders Add Lead button by default', () => {
    renderWithRouter()
    expect(screen.getByText(/add lead/i)).toBeInTheDocument()
  })

  it('hides Add Lead button when hideAddButton is true', () => {
    render(
      <MemoryRouter initialEntries={['/leads']}>
        <LeadsSubNav hideAddButton />
      </MemoryRouter>
    )
    expect(screen.queryByText(/add lead/i)).not.toBeInTheDocument()
  })

  it('highlights current nav item', () => {
    renderWithRouter('/leads/pipeline')
    const pipelineLink = screen.getByText('Pipeline')
    expect(pipelineLink).toBeInTheDocument()
  })
})
