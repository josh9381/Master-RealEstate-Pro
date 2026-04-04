import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { LeadsSubNav } from '../LeadsSubNav'

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

  it('highlights current nav item', () => {
    renderWithRouter('/leads/pipeline')
    const pipelineLink = screen.getByText('Pipeline')
    expect(pipelineLink).toBeInTheDocument()
  })
})
